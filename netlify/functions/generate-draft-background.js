// Netlify Function: generate-draft
// Vstupy: { source_url?, source_title?, study_text?, generate_image? }
// Výstupy: { success: true, draft_id, slug }
//
// Pipeline:
//   1) sestaví prompt podle science-journalism skillu
//   2) zavolá Anthropic Messages API a získá strukturovaný JSON článek
//   3) (volitelně) zavolá generate-image funkci k vyrobení ilustrace
//   4) uloží draft do Supabase přes REST API jako status='draft'
//
// Vyžaduje Netlify env proměnné:
//   ANTHROPIC_API_KEY     – klíč k Anthropic API
//   SUPABASE_URL          – např. https://qcwuieppccnozzcsjlxy.supabase.co
//   SUPABASE_SERVICE_ROLE – service role klíč (kvůli RLS — zápis do articles)
//   URL                   – Netlify nastavuje automaticky, použijeme pro chain image fn

const fetch = (() => {
  try { return require('node-fetch'); }
  catch (e) { return globalThis.fetch; }
})();

const ANTHROPIC_VERSION = '2023-06-01';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-6';

const SYSTEM_PROMPT = `Jsi popularizátor vědy. Píšeš pro web vedcizjistili.cz, který transformuje vědecké studie do přístupných intelektuálně provokativních článků pro obecné publikum.

VŽDY ZAVOLEJ TOOL save_article_draft a předej do něj kompletní strukturovaný článek. Nikdy nepiš odpověď v plain textu, vždy jen jako tool call.

STRUKTURA POLE content_html (HTML pro Quill editor), 600-900 slov, přesně v tomto pořadí:
1. Úvodní odstavec — kdo, kde, kdy + hlavní zjištění (autoři, instituce, rok)
2. <h2>Jak výzkum probíhal</h2> — metoda a velikost vzorku, 1-2 odstavce
3. <h2>Klíčová zjištění</h2> — pět odstavců, každý začíná <strong>1. Krátký nadpis bodu.</strong> ...
4. <h2>Pochyby nad výsledky</h2> — 1 až 3 odstavce, každý začíná <strong>Krátký nadpis pochyby.</strong>
5. <h2>Originální nadpis k out-of-the-box analogii</h2> — 1-2 odstavce s metaforou nebo analogií
6. <h2>Shrnutí</h2> — jedna věta destilující podstatu

POVOLENÉ HTML TAGY v content_html: <p>, <h2>, <strong>, <em>, <a href="...">. NEPOUŽÍVEJ <h1>, <ul>, <ol>, <div>, <span>, <br>, ani jiné značky.

STYL: intelektuálně provokativní, ale přístupný; konkrétní čísla z metodologie; bez superlativů a klišé; minimum cizích slov; srozumitelnost pro středoškoláka. Nikdy nevkládej do textu sám sebe (žádné „v tomto článku").

POLE image_prompt: anglický prompt pro DALL·E / OpenAI Images. Editorial minimalist, 1.91:1 aspect ratio, no text in image, restrained linework, New Yorker editorial style.`;

// Tool schema pro Anthropic Tool Use — API garantuje, že input do toolu bude vždy validní JSON,
// takže nepotřebujeme parsovat plain-text výstup a řešit neeskapované uvozovky uvnitř HTML.
const ARTICLE_TOOL = {
  name: 'save_article_draft',
  description: 'Uloží strukturovaný popularizační článek pro web vedcizjistili.cz. Vždy zavolej s kompletními daty.',
  input_schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Český titulek článku. Max. 80 znaků. Bez úvozovek na začátku/konci.'
      },
      excerpt: {
        type: 'string',
        description: 'Český perex pro archív, 2-3 věty, max. 350 znaků.'
      },
      content_html: {
        type: 'string',
        description: 'Tělo článku jako HTML pro Quill editor. Pouze povolené tagy <p>, <h2>, <strong>, <em>, <a href="...">. 600-900 slov. Strukturu viz system prompt.'
      },
      image_prompt: {
        type: 'string',
        description: 'Anglický prompt pro DALL·E / OpenAI Images.'
      },
      image_alt: {
        type: 'string',
        description: 'Český alt text pro ilustraci, 1 věta.'
      },
      source_title: {
        type: 'string',
        description: 'Název časopisu nebo zdroje (např. Nature, Science, ICS). Pokud není známý, vrať prázdný řetězec.'
      },
      source_url: {
        type: 'string',
        description: 'URL na studii. Pokud není známé, vrať prázdný řetězec.'
      }
    },
    required: ['title', 'excerpt', 'content_html', 'image_prompt']
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}

function envOrError(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env variable: ${name}`);
  return v;
}

// Velmi jednoduchý slug generátor — duplikát z database.js, aby fn nemusela načítat klient.
function makeSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ě]/g, 'e')
    .replace(/[ů]/g, 'u')
    .replace(/[š]/g, 's')
    .replace(/[č]/g, 'c')
    .replace(/[ř]/g, 'r')
    .replace(/[ž]/g, 'z')
    .replace(/[ť]/g, 't')
    .replace(/[ď]/g, 'd')
    .replace(/[ň]/g, 'n')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}

async function callClaude({ studyText, sourceUrl, sourceTitle }) {
  const userParts = [];
  if (sourceUrl) userParts.push(`Zdroj (URL): ${sourceUrl}`);
  if (sourceTitle) userParts.push(`Název zdroje: ${sourceTitle}`);
  if (studyText) {
    userParts.push('Text studie / abstrakt:');
    userParts.push(studyText);
  }
  if (userParts.length === 0) {
    throw new Error('Empty input — need study_text or source_url');
  }

  // Tool Use: Anthropic API parsuje a validuje JSON na své straně, takže vždy
  // dostaneme objekt v tool_use bloku, bez ohledu na uvozovky uvnitř HTML.
  const body = {
    model: ANTHROPIC_MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    tools: [ARTICLE_TOOL],
    tool_choice: { type: 'tool', name: ARTICLE_TOOL.name },
    messages: [{ role: 'user', content: userParts.join('\n\n') }]
  };

  const apiKey = envOrError('ANTHROPIC_API_KEY');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Anthropic API ${response.status}: ${data.error?.message || JSON.stringify(data)}`);
  }

  // Najdi tool_use blok se správným jménem.
  const toolUse = (data.content || []).find(
    b => b.type === 'tool_use' && b.name === ARTICLE_TOOL.name
  );
  if (!toolUse) {
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .substring(0, 500);
    throw new Error(
      `Claude nezavolal tool ${ARTICLE_TOOL.name}. stop_reason=${data.stop_reason}, text="${text}"`
    );
  }

  const parsed = toolUse.input || {};
  for (const k of ['title', 'excerpt', 'content_html', 'image_prompt']) {
    if (!parsed[k]) {
      throw new Error(`Tool input neobsahuje povinné pole "${k}". Klíče: ${Object.keys(parsed).join(', ')}`);
    }
  }
  return parsed;
}

// Inline image gen — přímé volání OpenAI Images + upload do Supabase Storage.
// Dříve to bylo chained na sync generate-image funkci, ale ta má 10s timeout
// a OpenAI Images potřebuje typicky 15-30 s. Background funkce, ve které tohle
// běží, má 15 min, takže oba kroky pohodlně stihnou.
async function maybeGenerateImage(imagePrompt) {
  if (!imagePrompt) return null;
  try {
    const buffer = await callOpenAIImages(imagePrompt, '1536x1024');
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.png`;
    const publicUrl = await uploadToSupabaseStorage(buffer, fileName);
    return publicUrl;
  } catch (e) {
    console.error('Image gen failed (inline):', e.message);
    return null;
  }
}

async function callOpenAIImages(prompt, size) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY není nastavený v env');
  }
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size,
      n: 1
    })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`OpenAI Images ${response.status}: ${data.error?.message || JSON.stringify(data)}`);
  }
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('OpenAI nevrátil b64_json: ' + JSON.stringify(data).substring(0, 300));
  }
  return Buffer.from(b64, 'base64');
}

async function uploadToSupabaseStorage(buffer, fileName) {
  const supabaseUrl = envOrError('SUPABASE_URL');
  const serviceKey = envOrError('SUPABASE_SERVICE_ROLE');
  const bucket = 'article-images';
  const path = `articles/${fileName}`;

  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'image/png',
      'x-upsert': 'false'
    },
    body: buffer
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Supabase Storage upload ${response.status}: ${err}`);
  }
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

async function insertDraftToSupabase(payload) {
  const supabaseUrl = envOrError('SUPABASE_URL');
  const serviceKey = envOrError('SUPABASE_SERVICE_ROLE');

  const response = await fetch(`${supabaseUrl}/rest/v1/articles`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Supabase insert ${response.status}: ${data.message || JSON.stringify(data)}`);
  }
  return Array.isArray(data) ? data[0] : data;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
  }

  try {
    const input = JSON.parse(event.body || '{}');
    const studyText = (input.study_text || '').trim();
    const sourceUrl = (input.source_url || '').trim();
    const sourceTitle = (input.source_title || '').trim();
    const wantImage = !!input.generate_image;

    if (!studyText && !sourceUrl) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ success: false, error: 'Vyplň study_text nebo source_url.' })
      };
    }

    // 1) Claude → strukturovaný článek
    const article = await callClaude({ studyText, sourceUrl, sourceTitle });

    // 2) Volitelný obrázek
    let imageUrl = null;
    if (wantImage && article.image_prompt) {
      imageUrl = await maybeGenerateImage(article.image_prompt);
    }

    // 3) Insert draftu do Supabase
    const today = new Date().toISOString().split('T')[0];
    const slug = makeSlug(article.title);
    const draft = await insertDraftToSupabase({
      title: article.title,
      content: article.content_html,
      excerpt: article.excerpt,
      date: today,
      slug,
      image_url: imageUrl,
      image_prompt: article.image_prompt || null,
      source_url: article.source_url || sourceUrl || null,
      source_title: article.source_title || sourceTitle || null,
      study_source: studyText || sourceUrl || null,
      generated_by: 'ai',
      status: 'draft'
    });

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        success: true,
        draft_id: draft.id,
        slug: draft.slug,
        image_generated: !!imageUrl
      })
    };
  } catch (error) {
    console.error('generate-draft error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
