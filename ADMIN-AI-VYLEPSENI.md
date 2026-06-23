# Návod: dotáhnout administraci vědci na úroveň BoomerChef

Tenhle dokument popisuje **krok za krokem**, jak vylepšit administraci „Vědci zjistili",
aby zadávání nových článků s pomocí AI bylo stejně jednoduché a uhlazené jako v projektu
**BoomerChef**. Je psaný tak, aby ho mohl provést buď člověk, nebo Claude Code / Cowork
session (klidně mu řekni: *„proveď ADMIN-AI-VYLEPSENI.md krok 1 a 2"*).

---

## Dobrá zpráva: většinu už máš

Vědci **už mají draft pipeline** – byla dokonce předlohou pro BoomerChef. Funguje:

- Sekce **„Rozpracované drafty"** v `admin.html` s formulářem *„Vygenerovat nový draft z AI"*.
- Netlify background funkce `netlify/functions/generate-draft-background.js` (Claude → strukturovaný JSON → volitelně OpenAI obrázek → uložení draftu).
- Polling na nový draft, seznam draftů s tlačítky **Upravit / Publikovat / Smazat**.
- V `database.js` hotové metody: `getAllDrafts()`, `createDraft()`, `publishDraft(id)`,
  `unpublishArticle(id)`, `updateArticle()`, `getArticleById()`, `uploadImage()`.
- Tabulka `articles` má `status` (`draft`/`published`), `image_url`, `image_prompt`, `generated_by`.

Takže **nestavíme od nuly** – jen doplníme čtyři uhlazovací detaily, ve kterých je BoomerChef dál.

### Srovnání: co BoomerChef má navíc

| Vlastnost | Vědci (teď) | BoomerChef | Akce |
|-----------|-------------|------------|------|
| Generování článku z AI | ✅ | ✅ | – |
| Po vygenerování otevřít draft k editaci | ❌ (jen obnoví seznam) | ✅ auto-otevře | **Krok 1** |
| Tlačítko „Vygenerovat / Nový obrázek" u článku | ❌ | ✅ | **Krok 2** |
| Tlačítko „Stáhnout z webu" (unpublish) | ❌ (metoda je, tlačítko ne) | ✅ | **Krok 3** |
| Zabezpečení generate funkce přihlášením | ❌ | ✅ | **Krok 4** (volitelné) |

---

## Krok 1 – Po vygenerování draft rovnou otevřít k editaci

**Cíl:** stejně jako v BoomerChefovi – jakmile AI dopíše draft, automaticky se otevře
v editačním formuláři, aby ho editor rovnou zkontroloval (nemusí ho hledat v seznamu).

**Soubor:** `admin.html`, funkce `handleAiDraftSubmit` (kolem řádku 1007).

Najdi tuhle část (po úspěšném pollingu):

```js
if (foundDraft) {
    statusEl.textContent = `Hotovo. Draft "${foundDraft.title}" čeká na kontrolu níže.`;
    statusEl.style.color = '#27ae60';
    document.getElementById('ai-draft-form').reset();
    document.getElementById('ai-draft-generate-image').checked = true;
    await loadDrafts();
}
```

A na konec `if` bloku přidej otevření draftu k editaci (funkce `editArticle` už existuje):

```js
if (foundDraft) {
    statusEl.textContent = `Hotovo. Draft "${foundDraft.title}" se otevřel k úpravě.`;
    statusEl.style.color = '#27ae60';
    document.getElementById('ai-draft-form').reset();
    document.getElementById('ai-draft-generate-image').checked = true;
    await loadDrafts();
    // Nově: rovnou otevři vygenerovaný draft v editačním formuláři
    editArticle(foundDraft.id);
}
```

Hotovo. Žádné další soubory se nemění.

---

## Krok 2 – Tlačítko „Vygenerovat obrázek" / „Nový obrázek" u článku

**Cíl:** u každého draftu i publikovaného článku tlačítko, které jedním klikem
dogeneruje (nebo přegeneruje) ilustraci – bez nutnosti regenerovat celý článek.

Vědci mají `netlify/functions/generate-image.js`, ale **není napojený na admin** a
neukládá výsledek do databáze. Přidáme samostatnou background funkci à la BoomerChef.

### 2a) Nová Netlify funkce

Vytvoř soubor **`netlify/functions/generate-image-recipe-background.js`**
(název ber jako „regenerace obrázku k článku"; suffix `-background` je nutný, aby
měla 15min limit). Funkce: ověří přihlášení → načte článek → nechá Claude napsat
anglický prompt z titulku a obsahu → OpenAI vygeneruje obrázek → upload do Storage →
uloží `image_url` k článku.

```js
// netlify/functions/generate-image-recipe-background.js
// Vstup (POST JSON): { article_id: number }
// Autorizace: Bearer <Supabase access token>
// Dogeneruje / přegeneruje obrázek k existujícímu článku a uloží image_url.

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

async function verifyUser(authHeader) {
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const supabaseUrl = envOrError('SUPABASE_URL');
  const anonKey = envOrError('SUPABASE_ANON_KEY');
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
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

    console.log(`[generate-image] hotovo: ${article.title}`);
    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    console.error('generate-image error:', error.message);
    return { statusCode: 500, body: error.message };
  }
};
```

> **Pozn. k env proměnným:** funkce potřebuje `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
> `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`, `SUPABASE_ANON_KEY` – ty už v Netlify máš
> (používá je `generate-draft-background.js`). Stačí přidat **`SUPABASE_ANON_KEY`**,
> pokud tam ještě není (anon klíč je veřejný, slouží jen na ověření přihlášení).

### 2b) Tlačítko v seznamu draftů i článků

V `admin.html` ve funkci **`loadDrafts()`** (cca ř. 847) doplň do bloku tlačítek
mezi „Upravit" a „Publikovat":

```html
<button class="btn btn-secondary" style="padding: 0.3rem 0.8rem; font-size: 0.8rem;"
  onclick="generateArticleImage(${d.id}, this)">${d.image_url ? 'Nový obrázek' : 'Vygenerovat obrázek'}</button>
```

Stejně tak v **`loadArticles()`** (cca ř. 1123) přidej k tlačítkům „Editovat"/„Smazat":

```html
<button class="btn btn-secondary" style="padding: 0.3rem 0.8rem; font-size: 0.8rem;"
  onclick="generateArticleImage(${article.id}, this)">Nový obrázek</button>
```

### 2c) JS funkce (do `admin.html`, k ostatním funkcím v `<script>`)

```js
const AI_IMAGE_URL = '/.netlify/functions/generate-image-recipe-background';

async function generateArticleImage(id, btn) {
    if (btn && btn.textContent === 'Nový obrázek' &&
        !confirm('Přegenerovat obrázek? Stávající se nahradí.')) return;

    const originalLabel = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Generuji…'; }

    try {
        const session = await window.authManager.getSession();   // viz pozn. níže
        if (!session) { alert('Nejsi přihlášený.'); if (btn) { btn.disabled = false; btn.textContent = originalLabel; } return; }

        // Zapamatuj si stávající obrázek, ať poznáš změnu
        const before = await window.articleDB.getArticleById(id);
        const originalImage = before ? before.image_url : null;

        const res = await fetch(AI_IMAGE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ article_id: id })
        });
        if (res.status >= 400) throw new Error(`Funkce vrátila ${res.status}: ${await res.text()}`);

        // Polling: čekej, dokud se image_url nezmění (max ~3 min)
        let found = null;
        for (let i = 0; i < 36 && !found; i++) {
            await new Promise(r => setTimeout(r, 5000));
            const a = await window.articleDB.getArticleById(id);
            if (a && a.image_url && a.image_url !== originalImage) found = a.image_url;
        }

        if (found) { await loadDrafts(); await loadArticles(); }
        else { if (btn) { btn.disabled = false; btn.textContent = originalLabel; } alert('Obrázek se zatím neobjevil – zkontroluj Netlify Functions logs.'); }
    } catch (e) {
        console.error('Chyba generování obrázku:', e);
        if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
        alert('Nepodařilo se vygenerovat obrázek: ' + e.message);
    }
}
```

> **Pozn. k session tokenu:** BoomerChef bere token přes
> `supabaseClient.auth.getSession()`. Ve vědci je Supabase klient v `supabaseClient` a
> auth ve `window.authManager`. Použij to, co je po ruce – buď
> `const { data: { session } } = await supabaseClient.auth.getSession();`, nebo si do
> `auth.js` přidej `getSession()` helper. Důležité je dostat `session.access_token`.

---

## Krok 3 – Tlačítko „Stáhnout z webu" (unpublish) u publikovaných

**Cíl:** jako „Skrýt" v BoomerChefovi – publikovaný článek jedním klikem vrátit do draftů.
Metoda `unpublishArticle(id)` v `database.js` už existuje, chybí jen tlačítko.

V `admin.html` ve funkci **`loadArticles()`** přidej k tlačítkům článku:

```html
<button class="btn" style="padding: 0.3rem 0.8rem; font-size: 0.8rem; background-color: #f39c12;"
  onclick="unpublishFromAdmin(${article.id}, '${article.title.replace(/'/g, "\\'")}')">Stáhnout z webu</button>
```

A přidej obslužnou funkci:

```js
async function unpublishFromAdmin(id, title) {
    if (!confirm(`Stáhnout článek „${title}" z webu zpět do draftů?`)) return;
    try {
        const result = await window.articleDB.unpublishArticle(id);
        if (result.success) { await loadArticles(); await loadDrafts(); }
        else alert('Chyba: ' + result.error);
    } catch (e) { console.error(e); alert('Došlo k chybě.'); }
}
```

---

## Krok 4 (volitelné) – Zabezpečit generate funkce přihlášením

Funkce `generate-draft-background.js` je veřejně dostupná – kdokoli, kdo zná URL, může
spustit (placené) generování. BoomerChef proto na začátku funkce ověřuje Supabase token.

Přidej do `generate-draft-background.js` (a do nové image funkce už to je) tohle a
zavolej to hned na začátku `handler`:

```js
async function verifyUser(authHeader) {
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, apikey: process.env.SUPABASE_ANON_KEY }
  });
  return res.ok;
}
// v handleru: if (!(await verifyUser(event.headers.authorization || event.headers.Authorization))) return { statusCode: 401, body: 'Unauthorized' };
```

A v `admin.html` v `handleAiDraftSubmit` doplň do `fetch(...)` hlavičku
`'Authorization': 'Bearer ' + session.access_token` (token získej stejně jako v Kroku 2).

---

## Co se NEmění (a proč)

- **Model na obrázky:** vědci jedou na **OpenAI gpt-image-1** (editorial styl), BoomerChef
  na **xAI Grok** (francouzská kuchařská ilustrace). Necháváme OpenAI – sedí k vědeckému
  webu. Kdybys chtěl Grok, viz `generate-image-recipe-background.js` v BoomerChefovi a
  vyměň `callOpenAIImages` za volání `https://api.x.ai/v1/images/generations`
  (model `grok-imagine-image-quality`).
- **Vstupní formulář:** vědci mají URL + zdroj + text (studie potřebuje kontext),
  BoomerChef má jen jeden textový blok (recept). To je správně – nesjednocovat.
- **Tabulka:** vědci `articles.status='draft'/'published'`, BoomerChef
  `recipes.is_published=true/false`. Funkčně totéž, neměnit.

---

## Nasazení

1. Změny v `admin.html` + nový soubor `netlify/functions/generate-image-recipe-background.js`.
2. Ověř, že v Netlify je env `SUPABASE_ANON_KEY` (pro ověření přihlášení).
3. `git add -A && git commit -m "Admin: auto-open draft, regenerate image, unpublish button" && git push`.
4. Netlify nasadí automaticky z větve `main`.
5. Otestuj: vygeneruj draft → měl by se otevřít k editaci; u článku klikni „Nový obrázek";
   u publikovaného „Stáhnout z webu". Při potížích: Netlify → Functions → Logs.

---

*Návod vychází z porovnání `boomerchef` (hotová, uhlazená pipeline) a `vedci` (stávající
draft pipeline). Reference: `DRAFT-PIPELINE.md` ve vědcích, `AI-PIPELINE.md` v BoomerChefovi.*
