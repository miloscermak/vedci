# 📋 Implementační průvodce - Nový design Vědci zjistili

## 🎯 Přehled změn

Tento průvodce vás provede kompletní implementací nového minimalistického designu pro web vedcizjistili.cz. Design je inspirovaný čistým stylem publikačních platforem jako Substack.

## ⚡ Rychlý start

**Časová náročnost:** cca 30-45 minut
**Náročnost:** Snadná (většina je copy-paste)
**Riziko:** Minimální (všechny změny jsou reverzibilní)

---

## 📁 Struktura projektu

Váš současný projekt má následující strukturu:
```
vedci/
├── index.html          # ← BUDEME UPRAVOVAT
├── styles.css          # ← BUDEME NAHRAZOVAT
├── admin.html          # (bez změn)
├── archiv.html         # ← MÍRNÁ ÚPRAVA
├── about.html          # ← MÍRNÁ ÚPRAVA
├── database.js         # ← PŘIDÁME FUNKCE
├── config.js           # (bez změn)
├── server.js           # (bez změn)
└── ...
```

---

## 🔧 Krok 1: Záloha současných souborů

### 1.1 Vytvoření zálohy

```bash
# V kořenovém adresáři projektu
cp index.html index_backup.html
cp styles.css styles_backup.css
cp database.js database_backup.js
```

### 1.2 Vytvoření nové větve (doporučeno)

```bash
git checkout -b novy-design
```

---

## 🎨 Krok 2: Nové CSS styly

### 2.1 Vytvoření nového souboru stylů

Vytvořte nový soubor `styles-new.css`:

```css
/* styles-new.css */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    --text-primary: #1a1a1a;
    --text-secondary: #6b6b6b;
    --border-light: #e5e5e5;
    --bg-light: #fafafa;
    --accent: #0066cc;
    --accent-hover: #0052a3;
    --max-width: 700px;
}

body {
    font-family: 'Crimson Text', Georgia, serif;
    font-size: 19px;
    line-height: 1.7;
    color: var(--text-primary);
    background: #ffffff;
    -webkit-font-smoothing: antialiased;
}

/* Header */
header {
    border-bottom: 1px solid var(--border-light);
    background: white;
    position: sticky;
    top: 0;
    z-index: 100;
}

.header-content {
    max-width: var(--max-width);
    margin: 0 auto;
    padding: 1.5rem 1.25rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.site-title {
    font-family: 'Inter', sans-serif;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    text-decoration: none;
    letter-spacing: -0.02em;
}

nav {
    display: flex;
    gap: 2rem;
}

nav a {
    font-family: 'Inter', sans-serif;
    font-size: 0.9rem;
    color: var(--text-secondary);
    text-decoration: none;
    transition: color 0.2s;
}

nav a:hover {
    color: var(--text-primary);
}

/* Main Container */
.container {
    max-width: var(--max-width);
    margin: 0 auto;
    padding: 3rem 1.25rem;
}

/* Featured Article with Image */
.featured-article {
    margin-bottom: 3rem;
    padding-bottom: 3rem;
    border-bottom: 1px solid var(--border-light);
}

.featured-image {
    width: 100%;
    height: 350px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 4px;
    margin-bottom: 1.5rem;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.5rem;
    font-family: 'Inter', sans-serif;
}

.featured-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.article-label {
    font-family: 'Inter', sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--accent);
    margin-bottom: 0.75rem;
}

.featured-article h2 {
    font-size: 2rem;
    font-weight: 400;
    line-height: 1.3;
    margin-bottom: 1rem;
}

.featured-article h2 a {
    color: var(--text-primary);
    text-decoration: none;
    transition: color 0.2s;
}

.featured-article h2 a:hover {
    color: var(--accent);
}

.article-excerpt {
    font-size: 1.1rem;
    color: var(--text-secondary);
    margin-bottom: 1rem;
}

.article-meta {
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    color: var(--text-secondary);
    display: flex;
    gap: 1rem;
}

.read-more {
    font-family: 'Inter', sans-serif;
    font-size: 0.95rem;
    color: var(--accent);
    text-decoration: none;
    font-weight: 500;
    display: inline-block;
    margin-top: 0.5rem;
    transition: color 0.2s;
}

.read-more:hover {
    color: var(--accent-hover);
    text-decoration: underline;
}

/* Glosa Section */
.glosa-section {
    background: var(--bg-light);
    border-left: 3px solid var(--text-primary);
    padding: 1.5rem;
    margin: 2rem 0 3rem 0;
}

.glosa-label {
    font-family: 'Inter', sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
    margin-bottom: 0.75rem;
}

.glosa-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
    line-height: 1.3;
}

.glosa-content {
    font-size: 1.05rem;
    line-height: 1.7;
}

.glosa-content p {
    margin-bottom: 0.75rem;
}

.glosa-content p:last-child {
    margin-bottom: 0;
}

.glosa-content a {
    color: var(--accent);
    text-decoration: underline;
}

.glosa-content a:hover {
    color: var(--accent-hover);
}

.glosa-author {
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-top: 1rem;
    font-style: italic;
}

/* Articles with thumbnails */
.articles-with-images {
    margin-bottom: 3rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid var(--border-light);
}

.article-with-image {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.article-thumbnail {
    flex-shrink: 0;
    width: 140px;
    height: 100px;
    background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
    border-radius: 4px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 0.875rem;
    font-family: 'Inter', sans-serif;
}

.article-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.article-with-image-content {
    flex: 1;
}

.article-with-image h3 {
    font-size: 1.3rem;
    font-weight: 400;
    margin-bottom: 0.5rem;
    line-height: 1.3;
}

.article-with-image h3 a {
    color: var(--text-primary);
    text-decoration: none;
    transition: color 0.2s;
}

.article-with-image h3 a:hover {
    color: var(--accent);
}

.article-with-image .excerpt {
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
    font-size: 1rem;
    line-height: 1.5;
}

.article-with-image .meta {
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    color: var(--text-secondary);
}

/* Simple articles list */
.articles-list {
    margin-top: 2rem;
}

.section-title {
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
    margin-bottom: 2rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-light);
}

.article-item {
    padding: 1rem 0;
    border-bottom: 1px solid var(--border-light);
}

.article-item:last-child {
    border-bottom: none;
}

.article-item h3 {
    font-size: 1.2rem;
    font-weight: 400;
    margin-bottom: 0.25rem;
    line-height: 1.3;
}

.article-item h3 a {
    color: var(--text-primary);
    text-decoration: none;
    transition: color 0.2s;
}

.article-item h3 a:hover {
    color: var(--accent);
}

.article-item .meta {
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    color: var(--text-secondary);
}

/* Newsletter Signup */
.newsletter-section {
    margin: 4rem 0;
    padding: 2rem;
    background: var(--bg-light);
    border-radius: 4px;
}

.newsletter-section h3 {
    font-family: 'Inter', sans-serif;
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
}

.newsletter-section p {
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
}

.newsletter-form {
    display: flex;
    gap: 0.75rem;
}

.newsletter-form input {
    flex: 1;
    padding: 0.75rem;
    font-family: 'Inter', sans-serif;
    font-size: 0.95rem;
    border: 1px solid var(--border-light);
    border-radius: 4px;
    background: white;
}

.newsletter-form input:focus {
    outline: none;
    border-color: var(--accent);
}

.newsletter-form button {
    padding: 0.75rem 1.5rem;
    font-family: 'Inter', sans-serif;
    font-size: 0.95rem;
    font-weight: 500;
    background: var(--text-primary);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
}

.newsletter-form button:hover {
    background: #333;
}

/* Archive Link */
.archive-link {
    text-align: center;
    margin: 3rem 0;
    padding-top: 2rem;
    border-top: 1px solid var(--border-light);
}

.archive-link a {
    font-family: 'Inter', sans-serif;
    font-size: 0.95rem;
    color: var(--accent);
    text-decoration: none;
    font-weight: 500;
}

.archive-link a:hover {
    text-decoration: underline;
}

/* Footer */
footer {
    border-top: 1px solid var(--border-light);
    padding: 2rem 0;
    margin-top: 4rem;
}

.footer-content {
    max-width: var(--max-width);
    margin: 0 auto;
    padding: 0 1.25rem;
    text-align: center;
}

.footer-content p {
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    color: var(--text-secondary);
}

/* Mobile Responsive */
@media (max-width: 640px) {
    body {
        font-size: 18px;
    }
    
    .featured-article h2 {
        font-size: 1.75rem;
    }
    
    .featured-image {
        height: 250px;
    }
    
    .article-with-image {
        flex-direction: column;
    }
    
    .article-thumbnail {
        width: 100%;
        height: 180px;
    }
    
    .newsletter-form {
        flex-direction: column;
    }
    
    nav {
        gap: 1rem;
    }
    
    .header-content {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
    }
}
```

---

## 📄 Krok 3: Nová struktura HTML

### 3.1 Vytvoření nového index.html

Vytvořte soubor `index-new.html`:

```html
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vědci zjistili</title>
    
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    
    <!-- Nové styly -->
    <link rel="stylesheet" href="styles-new.css">
    
    <!-- Supabase -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    
    <!-- Config a Database -->
    <script src="config.js"></script>
    <script src="database.js"></script>
</head>
<body>
    <header>
        <div class="header-content">
            <a href="/" class="site-title">Vědci zjistili</a>
            <nav>
                <a href="/">Články</a>
                <a href="/archiv.html">Archiv</a>
                <a href="/about.html">O projektu</a>
            </nav>
        </div>
    </header>
    
    <main class="container">
        <!-- Hlavní článek s velkým obrázkem -->
        <div id="featured-article-container">
            <!-- Dynamicky generováno -->
        </div>
        
        <!-- Glosa -->
        <div id="glosa-container">
            <!-- Dynamicky generováno -->
        </div>
        
        <!-- Další 2 články s náhledy -->
        <section id="articles-with-images" class="articles-with-images">
            <!-- Dynamicky generováno -->
        </section>
        
        <!-- Zbylé články jako jednoduchý seznam -->
        <section class="articles-list">
            <h2 class="section-title">Další články</h2>
            <div id="simple-articles-list">
                <!-- Dynamicky generováno -->
            </div>
        </section>
        
        <!-- Newsletter -->
        <div class="newsletter-section">
            <h3>Odebírejte newsletter</h3>
            <p>Každý týden vám pošleme výběr nejzajímavějších vědeckých objevů. Žádný spam, jen věda.</p>
            <form class="newsletter-form" id="newsletter-form">
                <input type="email" id="newsletter-email" placeholder="váš@email.cz" required>
                <button type="submit">Přihlásit</button>
            </form>
        </div>
        
        <!-- Archiv -->
        <div class="archive-link">
            <a href="/archiv.html">Zobrazit všechny články →</a>
        </div>
    </main>
    
    <footer>
        <div class="footer-content">
            <p>&copy; 2025 Vědci zjistili. Projekt Miloše Čermáka.</p>
        </div>
    </footer>
    
    <script src="homepage.js"></script>
</body>
</html>
```

---

## 🔌 Krok 4: JavaScript pro dynamický obsah

### 4.1 Vytvoření homepage.js

Vytvořte nový soubor `homepage.js`:

```javascript
// homepage.js
document.addEventListener('DOMContentLoaded', async () => {
    await loadFeaturedArticle();
    await loadGlosa();
    await loadArticlesWithImages();
    await loadSimpleArticlesList();
    initNewsletterForm();
});

// Načtení hlavního článku
async function loadFeaturedArticle() {
    try {
        const { data: articles, error } = await supabaseClient
            .from('articles')
            .select('*')
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .limit(1);
        
        if (error) throw error;
        
        const article = articles[0];
        if (!article) return;
        
        const container = document.getElementById('featured-article-container');
        
        container.innerHTML = `
            <article class="featured-article">
                <div class="featured-image">
                    ${article.image_url ? 
                        `<img src="${article.image_url}" alt="${article.title}">` : 
                        '[Hlavní obrázek]'
                    }
                </div>
                <div class="article-label">Nejnovější</div>
                <h2><a href="/article.html?id=${article.id}">${article.title}</a></h2>
                <p class="article-excerpt">
                    ${article.excerpt || article.content.substring(0, 400) + '...'}
                </p>
                <div class="article-meta">
                    <span>${formatDate(article.published_at)}</span>
                    <span>•</span>
                    <span>${estimateReadingTime(article.content)} min čtení</span>
                </div>
                <a href="/article.html?id=${article.id}" class="read-more">Číst celý článek →</a>
            </article>
        `;
    } catch (error) {
        console.error('Error loading featured article:', error);
    }
}

// Načtení glosy
async function loadGlosa() {
    try {
        const glosa = await getActiveGlosa();
        const container = document.getElementById('glosa-container');
        
        if (!glosa) {
            container.style.display = 'none';
            return;
        }
        
        container.innerHTML = `
            <div class="glosa-section">
                <div class="glosa-label">Glosa</div>
                <h2 class="glosa-title">${glosa.title}</h2>
                <div class="glosa-content">
                    ${glosa.content}
                </div>
                <div class="glosa-author">— ${glosa.author || 'Redakce'}</div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading glosa:', error);
    }
}

// Načtení článků s náhledy (2. a 3. článek)
async function loadArticlesWithImages() {
    try {
        const { data: articles, error } = await supabaseClient
            .from('articles')
            .select('*')
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .range(1, 2);  // Získat 2. a 3. článek
        
        if (error) throw error;
        
        const container = document.getElementById('articles-with-images');
        
        if (!articles || articles.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.innerHTML = articles.map(article => `
            <article class="article-with-image">
                <div class="article-thumbnail">
                    ${article.thumbnail_url ? 
                        `<img src="${article.thumbnail_url}" alt="${article.title}">` : 
                        '[Náhled]'
                    }
                </div>
                <div class="article-with-image-content">
                    <h3><a href="/article.html?id=${article.id}">${article.title}</a></h3>
                    <p class="excerpt">
                        ${article.excerpt || article.content.substring(0, 150) + '...'}
                    </p>
                    <div class="meta">${formatDate(article.published_at)}</div>
                </div>
            </article>
        `).join('');
    } catch (error) {
        console.error('Error loading articles with images:', error);
    }
}

// Načtení jednoduchého seznamu článků
async function loadSimpleArticlesList() {
    try {
        const { data: articles, error } = await supabaseClient
            .from('articles')
            .select('*')
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .range(3, 10);  // Získat 4. až 11. článek
        
        if (error) throw error;
        
        const container = document.getElementById('simple-articles-list');
        
        if (!articles || articles.length === 0) {
            container.innerHTML = '<p>Žádné další články.</p>';
            return;
        }
        
        container.innerHTML = articles.map(article => `
            <article class="article-item">
                <h3><a href="/article.html?id=${article.id}">${article.title}</a></h3>
                <div class="meta">${formatDate(article.published_at)}</div>
            </article>
        `).join('');
    } catch (error) {
        console.error('Error loading simple articles list:', error);
    }
}

// Newsletter formulář
function initNewsletterForm() {
    const form = document.getElementById('newsletter-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('newsletter-email').value;
        const button = form.querySelector('button');
        const originalText = button.textContent;
        
        try {
            button.disabled = true;
            button.textContent = 'Přihlašování...';
            
            // Použít existující funkci z database.js
            await subscribeToNewsletter(email);
            
            button.textContent = '✓ Přihlášeno!';
            form.reset();
            
            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
            }, 3000);
        } catch (error) {
            console.error('Newsletter subscription error:', error);
            button.textContent = 'Chyba!';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
            }, 3000);
        }
    });
}

// Helper funkce
function formatDate(dateString) {
    const date = new Date(dateString);
    const months = ['ledna', 'února', 'března', 'dubna', 'května', 'června',
                    'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
    
    return `${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function estimateReadingTime(text) {
    const wordsPerMinute = 200;
    const wordCount = text.trim().split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
}
```

---

## 🗄️ Krok 5: Úprava database.js

### 5.1 Přidání funkce pro aktivní glosu

Do souboru `database.js` přidejte (pokud ještě nemáte):

```javascript
// Funkce pro získání aktivní glosy
async function getActiveGlosa() {
    const { data, error } = await supabaseClient
        .from('glosas')
        .select('*')
        .eq('is_active', true)
        .single();
    
    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching active glosa:', error);
        return null;
    }
    return data;
}
```

---

## 🚀 Krok 6: Nasazení změn

### 6.1 Testování lokálně

1. Spusťte lokální server:
```bash
npm start
```

2. Otevřete v prohlížeči:
```
http://localhost:8000/index-new.html
```

3. Zkontrolujte:
- [ ] Načítání článků funguje
- [ ] Glosa se zobrazuje správně
- [ ] Newsletter formulář funguje
- [ ] Responzivní design na mobilu
- [ ] Všechny odkazy fungují

### 6.2 Přepnutí na nový design

Pokud vše funguje:

```bash
# Přejmenování souborů
mv index.html index-old.html
mv index-new.html index.html

mv styles.css styles-old.css
mv styles-new.css styles.css
```

### 6.3 Commit a push

```bash
git add .
git commit -m "Implementace nového minimalistického designu"
git push origin novy-design
```

### 6.4 Merge do main větve

```bash
git checkout main
git merge novy-design
git push origin main
```

---

## 📝 Krok 7: Úprava dalších stránek

### 7.1 Archiv (archiv.html)

Upravte link na nový stylesheet:
```html
<link rel="stylesheet" href="styles.css">
```

### 7.2 O projektu (about.html)

Stejná úprava:
```html
<link rel="stylesheet" href="styles.css">
```

---

## ⚙️ Krok 8: Optimalizace (volitelné)

### 8.1 Přidání obrázků do databáze

Přidejte sloupce do tabulky `articles`:

```sql
ALTER TABLE articles 
ADD COLUMN image_url TEXT,
ADD COLUMN thumbnail_url TEXT;
```

### 8.2 Cache pro statické soubory

Do `server.js` přidejte:

```javascript
app.use(express.static('public', {
    maxAge: '1d',  // Cache na 1 den
    etag: true
}));
```

---

## 🐛 Řešení problémů

### Problém: Články se nenačítají
**Řešení:** Zkontrolujte konzoli prohlížeče, ověřte připojení k Supabase

### Problém: Glosa se nezobrazuje
**Řešení:** Ověřte, že máte aktivní glosu v databázi (is_active = true)

### Problém: Newsletter nefunguje
**Řešení:** Zkontrolujte konfiguraci Resend v config.js

### Problém: Styly se neaplikují
**Řešení:** Vyčistěte cache prohlížeče (Ctrl+F5)

---

## ✅ Finální checklist

- [ ] Záloha původních souborů vytvořena
- [ ] Nové CSS soubory vytvořeny
- [ ] HTML struktura aktualizována
- [ ] JavaScript funkce implementovány
- [ ] Lokální test úspěšný
- [ ] Responzivní design otestován
- [ ] Změny commitnuty do Gitu
- [ ] Deploy na produkci dokončen
- [ ] Produkční test úspěšný

---

## 🎉 Hotovo!

Váš web má nyní moderní, čistý design inspirovaný nejlepšími publikačními platformami. Design je:

- **Minimalistický** - focus na obsah
- **Čitelný** - optimální typografie
- **Responzivní** - funguje na všech zařízeních
- **Rychlý** - žádné těžké knihovny
- **Profesionální** - důvěryhodný vzhled

---

## 📞 Podpora

Pokud narazíte na problém:
1. Zkontrolujte konzoli prohlížeče
2. Ověřte síťové požadavky (Network tab)
3. Vraťte se k záloze: `mv index-old.html index.html`

---

*Úspěšnou implementaci!* 🚀