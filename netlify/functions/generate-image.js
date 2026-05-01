// Netlify Function: generate-image
// Vstup: { prompt: string, size?: '1536x1024' }
// Výstup: { success: true, image_url: string, storage_path: string }
//
// Pipeline:
//   1) zavolá OpenAI Images API (model gpt-image-1)
//   2) dostane PNG jako base64
//   3) nahraje do Supabase Storage bucketu article-images
//   4) vrátí publicUrl
//
// Vyžaduje Netlify env:
//   OPENAI_API_KEY        – klíč k OpenAI
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE
//
// Preferovaný poměr stran webu je 1.91:1 (OG karta), proto default 1536x1024
// (~1.5:1, blízko ideálu a podporovaný velikostí).

const fetch = (() => {
  try { return require('node-fetch'); }
  catch (e) { return globalThis.fetch; }
})();

const DEFAULT_SIZE = '1536x1024';
const BUCKET = 'article-images';
const FOLDER = 'articles';

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

async function callOpenAIImages(prompt, size) {
  const apiKey = envOrError('OPENAI_API_KEY');
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
  // gpt-image-1 vrací b64_json (na rozdíl od dalle-3 kde lze i URL)
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI nevrátil b64_json: ' + JSON.stringify(data).substring(0, 300));
  return Buffer.from(b64, 'base64');
}

async function uploadToSupabaseStorage(buffer, fileName) {
  const supabaseUrl = envOrError('SUPABASE_URL');
  const serviceKey = envOrError('SUPABASE_SERVICE_ROLE');
  const path = `${FOLDER}/${fileName}`;

  const response = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`, {
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
  return {
    publicUrl: `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`,
    storagePath: path
  };
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
    const prompt = (input.prompt || '').trim();
    const size = input.size || DEFAULT_SIZE;
    if (!prompt) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ success: false, error: 'Missing prompt.' })
      };
    }

    const buffer = await callOpenAIImages(prompt, size);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.png`;
    const { publicUrl, storagePath } = await uploadToSupabaseStorage(buffer, fileName);

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        success: true,
        image_url: publicUrl,
        storage_path: storagePath
      })
    };
  } catch (error) {
    console.error('generate-image error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
