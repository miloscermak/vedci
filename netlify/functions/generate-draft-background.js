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

VÝSTUP MUSÍ BÝT VÝHRADNĚ JEDEN VALIDNÍ JSON OBJEKT (bez markdownových bloků, bez komentářů) s těmito klíči:
{
  "title": "Český titulek článku, max. 80 znaků, bez úvozovek na začátku/konci",
  "excerpt": "Český perex pro archív, 2-3 věty, max. 350 znaků",
  "content_html": "Tělo článku jako HTML pro Quill editor. Používej <p>, <h2>, <strong>, <em>, <a href>. Nepoužívej <h1> ani <ul>/<ol>.",
  "image_prompt": "Anglický prompt pro DALL·E / OpenAI Images. Editorial minimalist, 1.91:1 aspect ratio, no text in image, restrained linework, New Yorker editorial style.",
  "image_alt": "Český alt text pro ilustraci, 1 věta",
  "source_title": "Název časopisu/zdroje (např. Nature, Science, ICS)",
  "source_url": "URL na studii"
}

STRUKTURA TĚLA (content_html), 600-900 slov, přesně v tomto pořadí:
1. Úvodní odstavec — kdo, kde, kdy + hlavní zjištění
2. <h2>Jak výzkum probíhal</h2> — metoda a velikost vzorku, 1-2 odstavce
3. <h2>Klíčová zjištění</h2> — pět odstavců, každý začíná <strong>1. ...</strong>, <strong>2. ...</strong> atd.
4. <h2>Pochyby nad výsledky</h2> — 1 až 3 odstavce, každý začíná <strong>Krátký nadpis pochyby.</strong>
5. <h2>Originální nadpis k out-of-the-box analogii</h2> — 1-2 odstavce s metaforou nebo analogií
6. <h2>Shrnutí</h2> — jedna věta destilující podstatu

STYL: intelektuálně provokativní, ale přístupný; konkrétní čísla z metodologie; bez superlativů a klišé; minimum cizích slov; srozumitelnost pro středoškoláka. Nikdy nevkládej do textu sám sebe (žádné „v tomto článku").`;

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

  const body = {
    model: ANTHROPIC_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
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

  // Spojit content blocks (Claude vrací array of blocks)
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  // Vyextrahovat JSON: zkusíme najít první { až poslední }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error(`Claude vrátil odpověď bez JSON: ${text.substring(0, 300)}…`);
  }
  const jsonStr = text.substring(firstBrace, lastBrace + 1);
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`Claude vrátil neparsovatelný JSON: ${e.message}\n${jsonStr.substring(0, 500)}…`);
  }
  // Sanity check
  for (const k of ['title', 'excerpt', 'content_html', 'image_prompt']) {
    if (!parsed[k]) throw new Error(`Claude JSON neobsahuje povinné pole "${k}"`);
  }
  return parsed;
}

async function maybeGenerateImage(imagePrompt) {
  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  if (!baseUrl) {
    console.warn('No URL env, skipping image generation chain.');
    return null;
  }
  try {
    const response = await fetch(`${baseUrl}/.netlify/functions/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: imagePrompt })
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      console.error('generate-image returned error:', result);
      return null;
    }
    return result.image_url;
  } catch (e) {
    console.error('generate-image chain failed:', e.message);
    return null;
  }
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
