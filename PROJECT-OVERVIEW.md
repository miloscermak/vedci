# 📋 Přehled projektu: Vědci zjistili

## 🎯 O projektu

**Vědci zjistili** je webová platforma pro popularizaci vědy, která kombinuje lidský výběr s asistencí generativní AI. Projekt vznikl v rámci iniciativy Inspiruj.se a má za cíl převádět složité vědecké studie do srozumitelného, čtivého jazyka.

### Klíčové funkce:
- 📰 **Správa článků** s rich text editorem
- 📝 **Glosa systém** pro redakční komentáře
- 📧 **Newsletter** s ověřováním emailu
- 🎨 **Minimalistický design** inspirovaný Substackem
- 📱 **Plně responzivní** pro všechna zařízení

---

## 🏗️ Architektura projektu

### **Frontend Stack:**
- **HTML5** + čistý **JavaScript** (ES6+)
- **CSS3** s custom properties (CSS variables)
- **Quill.js** pro rich text editing v adminu
- **Google Fonts**: Crimson Text (serif) + Inter (sans-serif)

### **Backend Stack:**
- **Supabase** (PostgreSQL databáze + real-time API)
- **Netlify Functions** (serverless funkce pro email)
- **Resend API** pro odesílání emailů
- **Node.js** pro lokální development server

### **Hosting:**
- **Netlify** pro statické soubory + serverless funkce
- **Supabase** pro databázi a API
- **GitHub** pro version control

---

## 📁 Struktura souborů

```
vedci/
├── 🏠 FRONTEND
│   ├── index.html              # Hlavní stránka (homepage + články)
│   ├── homepage.js             # Logika homepage a stránek článků
│   ├── styles.css              # Minimalistické CSS styly
│   ├── archiv.html             # Archiv všech článků
│   ├── about.html              # O projektu (statická stránka)
│   └── admin.html              # Administrace (správa článků + glosa)
│
├── 📊 DATABASE & API
│   ├── config.js               # Supabase konfigurace
│   ├── database.js             # Database wrapper class
│   ├── database-setup.sql      # Základní databázové schéma
│   └── database-update.sql     # Aktualizace DB (slug podpora)
│
├── 📧 NEWSLETTER SYSTEM
│   ├── newsletter-generator.js # Generování HTML emailů
│   ├── newsletter-template.html # Šablona pro newsletter
│   ├── verification-email-template.html # Ověřovací email
│   └── netlify/functions/      # Serverless funkce
│       ├── send-email.js       # Odesílání jednotlivých emailů
│       └── send-newsletter.js  # Bulk newsletter odesílání
│
├── 🔧 CONFIGURATION
│   ├── netlify.toml           # Netlify deploy konfigurace
│   ├── package.json           # Node.js dependencies
│   └── server.js              # Lokální development server
│
├── 📚 DOCUMENTATION
│   ├── PROJECT-OVERVIEW.md    # Tento přehled
│   ├── README.md              # Základní instrukce
│   ├── NEWSLETTER-SETUP.md    # Návod na newsletter
│   └── CHANGELOG-2025-07-25.md # History změn
│
└── 🗄️ BACKUP & FALLBACK
    ├── index-old.html         # Záloha původního designu
    ├── styles-old.css         # Záloha původních stylů
    ├── restore_original.sh    # Script pro návrat k původnímu designu
    └── fallback0819.md        # Fallback instrukce
```

---

## 🗃️ Databázová struktura

### **Tabulka: `articles`**
```sql
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,           -- HTML z Quill editoru
    excerpt VARCHAR(1000) NOT NULL,  -- Krátký popis pro náhledy
    slug VARCHAR(100) UNIQUE,        -- URL friendly název (auto-generated)
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    image_url TEXT,                  -- URL obrázku článku
    source_url TEXT,                 -- Odkaz na původní studii
    source_title TEXT,               -- Název zdroje
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Tabulka: `glosas`**
```sql
CREATE TABLE glosas (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,           -- HTML obsah glosy
    author VARCHAR(200) DEFAULT 'Redakce',
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger: Pouze jedna aktivní glosa
CREATE OR REPLACE FUNCTION ensure_single_active_glosa()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true THEN
        UPDATE glosas SET is_active = false WHERE id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### **Tabulka: `newsletter_subscribers`**
```sql
CREATE TABLE newsletter_subscribers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    verification_token VARCHAR(100),
    is_verified BOOLEAN DEFAULT false,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    unsubscribe_token VARCHAR(100) UNIQUE
);
```

### **Tabulka: `pages`** (pro statické stránky)
```sql
CREATE TABLE pages (
    id SERIAL PRIMARY KEY,
    page_key VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🎨 Design System

### **Barevná paleta:**
```css
:root {
    --text-primary: #1a1a1a;      /* Hlavní text */
    --text-secondary: #6b6b6b;    /* Vedlejší text, metadata */
    --border-light: #e5e5e5;      /* Světlé ohraničení */
    --bg-light: #fafafa;          /* Světlé pozadí pro glosu/newsletter */
    --accent: #0066cc;            /* Akcentní barva pro odkazy */
    --accent-hover: #0052a3;      /* Hover stav odkazů */
    --max-width: 700px;           /* Maximální šířka obsahu */
}
```

### **Typography:**
- **Základní text**: Crimson Text (serif) - 21px
- **UI elementy**: Inter (sans-serif) - různé velikosti
- **Line height**: 1.7 pro optimální čitelnost

### **Komponenty:**
- ✅ **Featured article**: Hlavní článek s velkým obrázkem
- ✅ **Article thumbnails**: Články s malými náhledy
- ✅ **Article list**: Jednoduchý seznam článků
- ✅ **Glosa section**: Redakční komentář s výrazným designem
- ✅ **Newsletter form**: Inline formulář s validací
- ✅ **Navigation**: Minimalistické menu
- ✅ **Archive list**: Přehledný seznam všech článků

---

## 🔄 Logika aplikace

### **Homepage (index.html + homepage.js):**

1. **URL routing**:
   - `/` → Homepage s přehledem článků
   - `/?clanek=slug` → Detail konkrétního článku

2. **Homepage layout**:
   ```
   Header (navigace)
   ↓
   Hlavní článek (s obrázkem)
   ↓
   Glosa (pokud je aktivní)
   ↓
   2-3 články s náhledy
   ↓
   Seznam dalších článků
   ↓
   Newsletter signup
   ↓
   Footer
   ```

3. **Article page layout**:
   ```
   Header (navigace)
   ↓
   Článek (title + obrázek + obsah + zdroj)
   ↓
   Newsletter signup
   ↓
   Poslední články
   ↓
   Footer
   ```

### **Admin systém (admin.html):**

- **Správa článků**: CRUD operace s Quill.js editorem
- **Upload obrázků**: Supabase Storage integration
- **Glosa management**: Vytváření a aktivace glos
- **Newsletter**: Odesílání + seznam subscriberů
- **Preview**: Náhled článků před publikováním

### **Newsletter workflow:**

1. **Registrace**: Email + validace → verification token
2. **Ověření**: Email s odkazem → aktivace účtu
3. **Odesílání**: Admin → Netlify Function → Resend API → Subscribers

---

## 🚀 Deployment proces

### **Lokální development:**
```bash
npm install          # Instalace závislostí
npm start           # Spuštění dev serveru (port 8000)
```

### **Production deployment:**
1. **Commit** změn do GitHubu
2. **Netlify** automaticky detekuje push
3. **Build** a deploy na doménu
4. **Environment variables** (Supabase + Resend API keys)

### **Environment Variables (Netlify):**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
RESEND_API_KEY=your-resend-key
```

---

## 🔧 Klíčové funkce kódu

### **ArticleDatabase class (database.js):**
```javascript
// Hlavní API wrapper pro Supabase
class ArticleDatabase {
    // Články
    async getLatestArticle()
    async getArticleBySlug(slug)
    async getAllArticles()
    
    // Glosa systém
    async getActiveGlosa()
    async createGlosa(data)
    
    // Newsletter
    async addSubscriber(email)
    async getSubscribers()
}
```

### **Homepage routing (homepage.js):**
```javascript
// URL parametr rozhoduje o zobrazení
const urlParams = new URLSearchParams(window.location.search);
const articleSlug = urlParams.get('clanek');

if (articleSlug) {
    await showArticlePage(articleSlug);  // Detail článku
} else {
    await showHomepage();                // Seznam článků
}
```

### **Glosa trigger (SQL):**
```sql
-- Automaticky deaktivuje ostatní glosy při aktivaci nové
CREATE OR REPLACE FUNCTION ensure_single_active_glosa()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true THEN
        UPDATE glosas SET is_active = false WHERE id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 📈 Možná vylepšení do budoucna

### **Funkcionalita:**
- 🔍 **Fulltext search** článků
- 🏷️ **Kategorie a tagy** pro lepší organizaci
- 💬 **Komentáře** pod články
- 📊 **Analytics** sledování čtenosti
- 🌙 **Dark mode** přepínač
- 📱 **PWA** podpora pro offline čtení
- 🔔 **Push notifikace** pro nové články

### **Performance:**
- 🖼️ **Image optimization** (WebP, lazy loading)
- ⚡ **CDN** pro statické soubory
- 💾 **Caching** strategií
- 📦 **Bundle minification**

### **SEO:**
- 🎯 **Meta tags** generování
- 🗺️ **Sitemap.xml** automatické generování
- 🔗 **Structured data** (JSON-LD)
- 📄 **Open Graph** cards

---

## 🛠️ Troubleshooting

### **Časté problémy:**

1. **Články se nenačítají**:
   - Zkontroluj Supabase connection v config.js
   - Ověř environment variables na Netlify

2. **Newsletter nefunguje**:
   - Zkontroluj Resend API key
   - Ověř Netlify Functions deployment

3. **Obrázky se nezobrazují**:
   - Zkontroluj Supabase Storage políčky
   - Ověř image_url sloupec v databázi

4. **Glosa se nezobrazuje**:
   - Zkontroluj `is_active = true` v databázi
   - Ověř database trigger pro glosy

### **Fallback postup:**
```bash
# Návrat k původnímu designu
./restore_original.sh
git add . && git commit -m "Rollback to original design"
git push origin main
```

---

## 📞 Kontakt & Podpora

- **Autor**: Miloš Čermák
- **Projekt**: Vědci zjistili (Inspiruj.se)
- **Repository**: https://github.com/miloscermak/vedci
- **Live site**: https://vedcizjistili.cz

---

## 📜 License & Credits

- **Code**: Custom development
- **Design**: Minimalist, inspired by Substack
- **Fonts**: Google Fonts (Crimson Text + Inter)
- **Icons**: CSS-only implementations
- **AI Assistance**: Claude (Anthropic) pro development support

---

*Poslední aktualizace: 19. srpna 2025*
*Verze dokumentace: 1.0*