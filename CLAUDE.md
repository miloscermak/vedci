# CLAUDE.md – instrukce pro Claude Code / Cowork

Stručný kontext projektu a otevřené úkoly. Čtu si tento soubor automaticky, takže když na něčem začínáme, podívej se sem nejdřív.

---

## Co projekt dělá

**Vědci zjistili** (vedcizjistili.cz) – web popularizující čerstvé vědecké studie. Tým: Miloš Čermák. Vstupem je vědecká studie (PDF / URL / text), výstupem je strukturovaný popularizační článek + AI obrázek. Editor (Miloš) drafty schvaluje a publikuje.

Detailní přehled stacku najdi v `PROJECT-OVERVIEW.md`. Setup draft pipeline najdi v `DRAFT-PIPELINE.md`.

---

## Klíčové architektonické rozhodnutí (1. května 2026)

Postavena automatizovaná draft pipeline od studie po publikaci. Editor je „human in the loop" v admin UI.

```
Studie (URL/text)
   │
   ├── Cowork (chat)  ──┐
   │                    ▼
   │            Anthropic API (Tool Use, science-journalism prompt)
   │                    │
   │                    ├── OpenAI gpt-image-1 (1536×1024)
   │                    │            │
   │                    │            ▼
   │                    │     Supabase Storage
   │                    │     /article-images
   │                    ▼
   │            Supabase /articles  status='draft'
   │                    │
   ├── Admin form ──────┘
                        │
                        ▼
              Editor → admin.html
                        │
                        ▼
                Tlačítko Publikovat
                        │
                        ▼
              status='published', published_at=now
```

**Co si pamatuj:**

- Background functions na Netlify (`*-background.js` suffix). Sync funkce mají 10s timeout, AI volání to nestihne. Background mají 15 min.
- **Žádný HTTP chain mezi background a sync funkcí.** Image gen dělej inline ve stejné background funkci, jinak narazíš na 10s sync timeout. (Generate-image.js je sync, takže hodí 504. Ponechej ji jen pro budoucí ad-hoc volání.)
- Anthropic API – **vždy Tool Use s input_schema**. Plain-text JSON parsing padá na neeskapovaných uvozovkách v HTML. Tool Use to vyřeší na úrovni API.
- Supabase write z funkce – **service_role klíč**, ne anon. Anon je svázaný RLS.

---

## Kritické soubory

| Soubor | Co dělá |
|---|---|
| `database.js` | Wrapper třída `ArticleDatabase`. Public read metody filtrují `status='published'`. Draft API: `createDraft`, `publishDraft`, `unpublishArticle`, `getAllDrafts`. |
| `homepage.js` | 3 přímé Supabase queries pro homepage – všechny mají `.eq('status', 'published')`. |
| `admin.html` | Sekce **Rozpracované drafty** + formulář **Vygenerovat nový draft z AI**. Polling DB každých 5s, 3 min timeout. |
| `netlify/functions/generate-draft-background.js` | Hlavní funkce. Anthropic Tool Use → strukturovaný JSON → inline OpenAI Images → Supabase Storage upload → insert draftu. |
| `netlify/functions/generate-image.js` | Sync funkce, dnes nepoužívaná draft pipeline. Stojí za ponechání pro budoucí ad-hoc volání ze stránky editace draftu. |
| `migrations/2026-05-01-draft-pipeline.sql` | Migrace přidávající `status`, `image_prompt`, `study_source`, `published_at`, `generated_by` + indexy + check constraint. |

---

## Netlify env variables (musí být nastavené)

- `ANTHROPIC_API_KEY` – klíč k Anthropic API
- `OPENAI_API_KEY` – klíč k OpenAI Images
- `SUPABASE_URL` – `https://qcwuieppccnozzcsjlxy.supabase.co`
- `SUPABASE_SERVICE_ROLE` – service role klíč (NIKDY do client-side)
- `RESEND_API_KEY` – existující, pro newsletter
- `ANTHROPIC_MODEL` – volitelné, default `claude-opus-4-6`

---

## Co bylo dnes vyřešeno

1. **Schema migrace** – přidány sloupce `status`, `image_prompt`, `study_source`, `published_at`, `generated_by` do `articles`. Backfill existujících 138 článků na `published`.
2. **database.js refactor** – read metody filtrují published, draft API přidáno.
3. **Admin Drafty sekce** – list draftů s badgi `AI` / `Cowork`, tlačítka Upravit / Publikovat / Smazat, formulář pro AI generování.
4. **Background function pipeline** – Anthropic Tool Use → OpenAI gpt-image-1 inline → Supabase Storage → insert.
5. **Bug fix slug** – `generateSlug` neuměl `ě` (článek o AI awareness skončil pod slugem `…-v-di` místo `…-vedi`). Opraveno přes Unicode normalizaci.
6. **Production deploy branch fix** – Netlify měla production branch nastavenou na starý Claude Code branch `claude/admin-website-setup-…`, ne na `main`. Přepnuto na main.
7. **První ostrý článek z pipeline publikovaný** – AI vs. lékaři v diagnostickém úsudku (https://vedcizjistili.cz/?clanek=umela-inteligence-prekonala-stovky-lekaru-v-diagnostickem-uv).

---

## Otevřené úkoly (priority dle Miloše)

### Polish

1. **Slug se neuřízne uprostřed slova.** Současný `generateSlug` v `database.js` ořezává tvrdě na 60 znaků (`substring(0, 60)`). Příště ořezat na poslední pomlčce před 60. znakem, ať slugy končí celým slovem. Příklad selhání: článek o AI v diagnostice skončil sluggem `…diagnostickem-uv` místo `…diagnostickem-uvaze`.

### UX adminu

2. **Náhled obrázku v draft listu.** Místo „obrázek ✓ / chybí" rendrovat reálný thumbnail (např. 80×42 px, lazy-loaded). Editor pak pozná podle obrázku, který draft je který.
3. **Tlačítko „Vygenerovat nový obrázek"** v editačním formuláři draftu. Když AI vyrobí nepoužitelný obrázek, editor zadá nový prompt (nebo si nechá ten Claudův) a klikne. Volá `generate-image` (sync, ale s 26s Pro nebo přes nový background variant). Uloží novou URL do `image_url`.
4. **„Stáhnout publikovaný článek do draftu"** – UI pro `unpublishArticle` (existuje API, chybí jen tlačítko).

### Pipeline rozšíření

5. **Auto-fetch URL studie.** Místo aby editor kopíroval abstrakt, funkce dostane URL a sama stáhne text. Pro Open Access studie (PMC, arXiv, MDPI) snadné. Pro paywalled (Nature, Science, Tandfonline) potřeba dohodnutý postup – buď ignorovat (editor musí poskytnout text), nebo specializovaný extractor.
6. **PDF parser** – Netlify funkce, která dostane PDF, vrátí čistý text. Napojit na bod 5 a admin formulář. Lze vyřešit přes `pdfjs-dist` (čistý JS) nebo `pdf-parse` (Node native).
7. **AB test claude-opus-4-6 vs. claude-sonnet-4-6.** Sonnet stojí ~10× méně, je rychlejší, drží strukturu lépe. Opus má lepší cit pro analogie a out-of-the-box section. Spustit oba na stejné studii, porovnat ručně, rozhodnout.

### Automatizace

8. **Scheduled Netlify Function** – ráno projde RSS feedy (Nature Briefing, Science Daily, Eurek Alert) a předpřipraví drafty bez zásahu editora. Editor pak ráno otevře admin a vidí např. 3 drafty ke schválení. Frequency: 1× denně 6:00.
9. **Slack/email notifikace o novém draftu** – až bude bod 8, ať mi Resend pošle email „máš X nových draftů" nebo zpráva na Slack.

### Newsletter integrace

10. **Auto-zařazení nově publikovaného článku do dalšího newsletteru.** Aktuálně se newsletter posílá manuálně přes výběr v adminu. Mohlo by to být plánované – např. týdenní zpravodaj zahrnující všechny články za týden, automaticky.

---

## Drobnosti k pamatování

- Slug bug s `ě`/`ů` byl v `generateSlug`. Před deploy fixu měl jeden článek slug `…-v-di` místo `…-vedi`. Zachováno v DB pod nesprávným slugem (URL se nezměnila kvůli SEO/sdíleným odkazům). Pokud někdy budeš generovat slug pro nový článek, zkontroluj, že obsahuje všechny české znaky.
- Drafts list v adminu polluje DB každých 5s po dobu 3 min. Polling timeout může být v některých případech krátký – ostrá studie s plným abstraktem trvala 1m41s, ostatní studie můžou jet déle. Pokud bude víc stížností, prodluž na 6 min.
- Cowork (Claude desktop) má své stejné approach pro vytváření draftů: zapsat přímo do Supabase přes anon key (RLS u nás povoluje insert), ne přes Netlify funkci. Proto Cowork workflow nemá závislost na Netlify env.
- Při práci v Cowork sandboxu se občas zaseknou git lock files (`.git/index.lock`, `.git/HEAD.lock`) na FUSE mountu – nejde je odstranit přes `rm`, ale jde je přejmenovat (`mv .git/index.lock .git/x`). Při lokálním pushi z laptopu se to nestává.

---

## Pravidla pro Cowork workflow

Když mi pošle Miloš studii v chatu a chce z ní článek:

1. Otevři skill `science-journalism` (nebo přečti `/var/folders/h0/.../skills/science-journalism/SKILL.md`).
2. Stáhni / přečti studii. Pokud je za paywall a Miloš nepošle text, požádej o text.
3. Napiš článek dle skillu, 600-900 slov, struktura úvod → metoda → 5 zjištění → pochyby → out-of-the-box → shrnutí.
4. Vyrob slug, excerpt, prompt na obrázek.
5. Zapis přímo do Supabase tabulky `articles` přes anon key:
   ```js
   await supabase.from('articles').insert({
     title, content, excerpt, slug, date, source_title, source_url,
     image_prompt, study_source: <originální text/URL>,
     status: 'draft', generated_by: 'cowork'
   });
   ```
6. Řekni Milošovi: „Draft #X je v adminu připravený, zkontroluj a publikuj."

Pokud Miloš chce obrázek vyrobený, zatím to musí udělat externě (ChatGPT/Gemini) a v adminu nahrát ručně. Případně zavolat `generate-image` Netlify funkci přes curl.

---

*Aktualizováno: 1. května 2026 (po prvním ostrém průchodu pipeline)*
