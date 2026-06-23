// Netlify Background Function: generate-article-image
// Vstup (POST JSON): { article_id: number }
// Autorizace: Bearer <Supabase access token> (volitelně – viz verifyUser)
//
// Dogeneruje / přegeneruje ilustraci k EXISTUJÍCÍMU článku:
//   1) (volitelně) ověří přihlášení
//   2) načte článek z DB (title, content)
//   3) nechá Claude napsat anglický editorial prompt z titulku a obsahu
//   4) OpenAI gpt-image-1 vygeneruje obrázek → upload do Supabase Storage
//   5) uloží image_url (a image_prompt) k článku
//
// Node 18+ (Netlify) má fetch globálně – žádná závislost není potřeba.
//
// Env: ANTHROPIC_API_KEY, OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE
//      a (doporučeno) SUPABASE_ANON_KEY pro ověření přihlášení.

const ANTHROPIC_VERSION = '2023-06-01';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
const BUCKET = 'article-images';
const FOLDER = 'articles';

const PROMPT_TOOL = {
  name: 'save_image_prompt',
  description: 'Uloží anglický prompt pro generátor obrázku.',
  input_schema: {
    type: 'object',
    properties: {
      image_prompt: { type: 'string', description: 'Anglický prompt: editorial minimalist illustration, 1.91:1 aspect ratio, no text in image, restrained linework, New Yorker editorial style. Vystihni téma článku.' }
    },
    required: ['image_prompt']
  }
};

function envOrError(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Chybí env proměnná: ${name}`);
  return v;
}

// Ověření přihlášení. Když SUPABASE_ANON_KEY není nastavený, ověření se přeskočí
// (aby se nová funkce nerozbila dřív, než přidáš klíč). Jakmile klíč doplníš do
// Netlify env, ověření se automaticky zapne.
async function verifyUser(authHeader) {
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!anonKey) {
    console.warn('SUPABASE_ANON_KEY není nastavený – přeskakuji ověření přihlášení.');
    return true;
  }
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  try {
    const res = await fetch(`${envOrError('SUPABASE_URL')}/auth/v1/user`, {
      method: 'GET', headers: { Authorization: `Bearer ${token}`, apikey: anonKey }
    });
    return res.ok;
  } catch (e) { return false; }
}

async function fetchArticle(id) {
  const supabaseUrl = envOrError('SUPABASE_URL');
  const serviceKey = envOrError('SUPABASE_SERVICE_ROLE');
  const res = await fetch(
    `${supabaseUrl}/rest/v1/articles?id=eq.${encodeURIComponent(id)}&select=id,title,content`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const rows = res.ok ? await res.json() : [];
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

// Z titulku a obsahu necháme Claude napsat anglický editorial prompt.
async function buildImagePrompt(article) {
  const snippet = (article.content || '').replace(/<[^>]+>/g, ' ').slice(0, 800);
  const body = {
    model: ANTHROPIC_MODEL, max_tokens: 1024,
    tools: [PROMPT_TOOL], tool_choice: { type: 'tool', name: PROMPT_TOOL.name },
    messages: [{ role: 'user', content: `Napiš anglický prompt pro editorial ilustraci k tomuto článku.\n\nNadpis: ${article.title}\n\nÚryvek: ${snippet}` }]
  };
  const apiKey = envOrError('ANTHROPIC_API_KEY');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': ANTHROPIC_VERSION, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${data.error?.message || JSON.stringify(data)}`);
  const toolUse = (data.content || []).find(b => b.type === 'tool_use' && b.name === PROMPT_TOOL.name);
  if (!toolUse?.input?.image_prompt) throw new Error('Claude nevrátil image_prompt.');
  return toolUse.input.image_prompt;
}

async function callOpenAIImages(prompt) {
  const apiKey = envOrError('OPENAI_API_KEY');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1536x1024', n: 1 })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`OpenAI Images ${res.status}: ${data.error?.message || JSON.stringify(data)}`);
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI nevrátil b64_json.');
  return Buffer.from(b64, 'base64');
}

async function uploadAndGetUrl(buffer) {
  const supabaseUrl = envOrError('SUPABASE_URL');
  const serviceKey = envOrError('SUPABASE_SERVICE_ROLE');
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.png`;
  const path = `${FOLDER}/${fileName}`;
  const res = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, 'Content-Type': 'image/png', 'x-upsert': 'true' },
    body: buffer
  });
  if (!res.ok) throw new Error(`Storage upload ${res.status}: ${await res.text()}`);
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
}

async function updateArticleImage(id, imageUrl, prompt) {
  const supabaseUrl = envOrError('SUPABASE_URL');
  const serviceKey = envOrError('SUPABASE_SERVICE_ROLE');
  const res = await fetch(`${supabaseUrl}/rest/v1/articles?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ image_url: imageUrl, image_prompt: prompt })
  });
  if (!res.ok) throw new Error(`Supabase update ${res.status}: ${await res.text()}`);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  try {
    const authHeader = event.headers['authorization'] || event.headers['Authorization'];
    if (!(await verifyUser(authHeader))) return { statusCode: 401, body: 'Unauthorized' };

    const input = JSON.parse(event.body || '{}');
    const id = input.article_id;
    if (!id) return { statusCode: 400, body: 'Missing article_id' };

    const article = await fetchArticle(id);
    if (!article) return { statusCode: 404, body: 'Article not found' };

    const prompt = await buildImagePrompt(article);
    const buffer = await callOpenAIImages(prompt);
    const imageUrl = await uploadAndGetUrl(buffer);
    await updateArticleImage(id, imageUrl, prompt);

    console.log(`[generate-article-image] hotovo: ${article.title}`);
    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    console.error('generate-article-image error:', error.message);
    return { statusCode: 500, body: error.message };
  }
};
