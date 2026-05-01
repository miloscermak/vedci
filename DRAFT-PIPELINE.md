# Draft pipeline – setup a workflow

Tato dokumentace popisuje, jak rozjet automatizovanou pipeline pro tvorbu článků na vedcizjistili.cz.

---

## Co pipeline dělá

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Vstup studie    │ →  │   Claude API     │ →  │  Strukturovaný   │
│ (URL/PDF/text)   │    │ (science-journ.) │    │  JSON článku     │
└──────────────────┘    └──────────────────┘    └────────┬─────────┘
                                                         │
                  ┌──────────────────────────────────────┤
                  ↓                                      ↓
          ┌──────────────┐                       ┌──────────────┐
          │ OpenAI Image │ → Supabase Storage    │  Supabase    │
          │ (volitelné)  │   /article-images     │  /articles   │
          └──────────────┘                       │ status=draft │
                                                 └──────┬───────┘
                                                        │
                                                        ↓
                                            ┌────────────────────┐
                                            │ Editor v admin.html│
                                            │ → Publikovat       │
                                            └────────────────────┘
```

Vstupní bránou jsou dvě cesty:

1. **Cowork** (Claude desktop) — pošleš studii v chatu, Claude napíše draft a zapíše ho přímo do Supabase přes anon key (žádný API klíč navíc).
2. **Admin web** — sekce „Vygenerovat nový draft z AI" v `admin.html`. Volá Netlify funkci `generate-draft.js`.

V obou případech editor finalizuje publikaci kliknutím na **Publikovat** v sekci „Rozpracované drafty".

---

## 1) Spuštění SQL migrace

Otevři Supabase → Project → **SQL Editor**, vlož celý obsah `migrations/2026-05-01-draft-pipeline.sql` a spusť. Migrace:

- přidá `status`, `image_prompt`, `study_source`, `published_at`, `generated_by` do tabulky `articles`,
- nastaví všechny existující články na `status='published'`,
- vytvoří indexy pro filtrování,
- přidá CHECK constraint pro povolené hodnoty `status`.

Ověř SQL dotazem `SELECT status, count(*) FROM articles GROUP BY status;` — měl bys vidět všechny stávající záznamy v `published`.

---

## 2) Netlify environment variables

V Netlify → Site → Site settings → **Environment variables** přidej:

| Klíč | Hodnota | Účel |
|------|---------|------|
| `ANTHROPIC_API_KEY` | `sk-ant-…` | Claude API pro generate-draft |
| `OPENAI_API_KEY` | `sk-proj-…` | OpenAI Images pro generate-image |
| `SUPABASE_URL` | `https://qcwuieppccnozzcsjlxy.supabase.co` | server-side přístup |
| `SUPABASE_SERVICE_ROLE` | `eyJ…` (Service Role klíč) | bypassuje RLS pro write |
| `ANTHROPIC_MODEL` | `claude-opus-4-6` *(volitelné, jinak default)* | model pro draft |

**Service Role klíč** najdeš v Supabase → Project Settings → API → `service_role` (DROBNÉ UPOZORNĚNÍ: tento klíč má plný přístup k databázi, NIKDY ho nedávej do client-side kódu — proto patří jen do Netlify env, ne do `config.js`).

Po uložení env proměnných spusť redeploy (Deploys → Trigger deploy → Deploy site).

---

## 3) Workflow A – z Coworku (denní praxe)

1. V Coworku napíšeš: *„Mám studii: <URL>"* nebo *„Zpracuj tento text studie: …"*
2. Claude:
   - přečte studii,
   - vygeneruje článek dle `science-journalism` skillu,
   - vyrobí slug, excerpt, prompt na obrázek,
   - zapíše záznam do `articles` se `status='draft'` a `generated_by='cowork'`.
3. Otevřeš `admin.html` → sekce **Rozpracované drafty** → klikneš **Upravit** (volitelně doladíš v Quillu) → **Publikovat**.

---

## 4) Workflow B – z admin webu

1. V `admin.html` přejdeš na sekci **Rozpracované drafty** → vyplníš URL studie, název zdroje a text/abstrakt.
2. Zaškrtneš **Vygenerovat zároveň ilustrační obrázek** (pokud chceš).
3. Klikneš **Vygenerovat draft**. Behind the scenes:
   - admin volá `/.netlify/functions/generate-draft`,
   - ta zavolá Anthropic API,
   - dostane strukturovaný JSON,
   - (volitelně) zavolá `/.netlify/functions/generate-image`, která volá OpenAI Images a uploaduje PNG do Supabase Storage,
   - uloží draft do databáze.
4. Draft se objeví ve výpisu níže. **Upravit** → **Publikovat**.

---

## 5) Po publikaci

- Veřejný frontend (homepage, archiv, RSS) zobrazuje pouze `status='published'`.
- Newsletter selector v adminu vidí jen publikované články (drafty nejdou poslat omylem).
- Pokud chceš článek dočasně stáhnout, použij `articleDB.unpublishArticle(id)` z konzole prohlížeče (UI button přidáme později).

---

## 6) Co bylo opraveno mimochodem

- `database.js` `generateSlug()` neuměl `ě`, takže článek o AI awareness skončil pod slugem `…-v-di` místo `…-vedi`. Nový generátor používá Unicode normalizaci a explicitní mapování kompletní české diakritiky.
- Stávající `addArticle()` od teď výslovně nastavuje `status='published'` a `published_at=now`, takže ruční formulář v adminu zůstává plně funkční.

---

## 7) Co dál (návrhy pro další iteraci)

- **Auto fetch URL** v `generate-draft`: nahrávat obsah studie přímo z URL (zatím musí editor nakopírovat text).
- **PDF parser**: Netlify funkce pro extrakci textu z PDF + napojení do generate-draft.
- **Náhled obrázku** v admin draft listu (zatím se ukáže jen ✓/chybí).
- **Diff view** mezi navrženým draftem a posledním uloženým stavem.
- **Auto unpublish UI** + admin tlačítko „Stáhnout z webu zpět do draftu".
- **Cron** přes Netlify Scheduled Function: každé ráno hledá nové studie z předdefinovaných RSS (Nature briefing, Science daily) a chystá drafty.

---

## 8) Troubleshooting

- **504 Gateway Timeout / „Inactivity Timeout" HTML**: řešeno přechodem na Netlify Background Function (suffix `-background.js`). Klient dostává 202 a polluje DB. Pokud se draft neobjeví do 3 minut, zkontroluj Netlify → Functions → `generate-draft-background` → Logs.
- **„Missing env variable" 500** z Netlify: nezapomněl jsi přidat všechny čtyři proměnné a redeploy?
- **Anthropic API 401**: zkontroluj klíč v env, ne v kódu.
- **Anthropic API 400 (overloaded model)**: zkus přepnout `ANTHROPIC_MODEL` na `claude-sonnet-4-6`.
- **Supabase insert 401/403**: použil jsi anon klíč místo service_role? RLS by tě smetla. Service role bypassuje RLS.
- **OpenAI 400 (size)**: gpt-image-1 podporuje 1024x1024, 1536x1024, 1024x1536. Webový hero je 1.91:1, takže 1536x1024 je nejbližší rozumný kompromis.
- **Obrázek se neuploadl**: zkontroluj, že bucket `article-images` existuje v Supabase Storage a má v Policies povolený insert pro service_role.

---

*Verze 1.0 · 1. května 2026*
