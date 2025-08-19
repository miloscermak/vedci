# 🚀 Moderní redesign homepage - Vědci zjistili

## Přehled redesignu

Nový design transformuje web Vědci zjistili na moderní, vizuálně atraktivní platformu, která zachovává jednoduchost a přidává wow efekt.

## ✨ Hlavní features nového designu

### 1. **Animované pozadí s gradientem**
- Dynamický gradient (fialová → růžová)
- Plovoucí geometrické tvary s blur efektem
- Subtilní rotační animace

### 2. **Hero sekce s newsletter CTA**
- Výrazný titulek "Věda, která vás chytne"
- Integrovaný newsletter formulář přímo v hero sekci
- Moderní zaoblené inputy s hover efekty

### 3. **Vylepšený hlavní článek**
- Velký featured card s gradientním pozadím
- Badge "🔥 Nejnovější" s animací
- Hover efekt - karta se zvedá při najetí myší
- Meta informace s emojis (datum, čas čtení, kategorie)

### 4. **Redesignovaná glosa**
- Žlutý gradient pozadí (vyniká mezi články)
- Dekorativní emoji v pozadí
- Dvousloupcový layout na desktopech
- Výrazný label a elegantní typografie

### 5. **Grid dalších článků**
- Moderní kartový design
- Kategorie jako floating badge
- Hover animace - karty se zvedají
- Čistý, minimalistický vzhled

### 6. **Interaktivní prvky**
- Tlačítka s hover animacemi
- Plynulé přechody
- Podtržení odkazů v navigaci při hoveru
- Pulzující logo emoji

## 📁 Implementace - krok za krokem

### Krok 1: Záloha současných souborů

```bash
# Vytvořte zálohu
cp index.html index_backup.html
cp styles.css styles_backup.css
```

### Krok 2: Nový soubor styles-modern.css

Vytvořte nový soubor `styles-modern.css`:

```css
/* Vložte CSS z artifacts výše */
/* Tento soubor obsahuje všechny moderní styly */
```

### Krok 3: Úprava index.html

```html
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vědci zjistili - Věda, která vás chytne</title>
    
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    
    <!-- Moderní styly -->
    <link rel="stylesheet" href="styles-modern.css">
    
    <!-- Supabase -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    
    <!-- Config a Database -->
    <script src="config.js"></script>
    <script src="database.js"></script>
</head>
<body>
    <!-- Animované pozadí -->
    <div class="animated-bg">
        <div class="floating-shapes">
            <div class="shape"></div>
            <div class="shape"></div>
            <div class="shape"></div>
        </div>
    </div>
    
    <!-- Header zůstává, jen nové styly -->
    <header>
        <div class="header-content">
            <a href="/" class="logo">Vědci zjistili</a>
            <nav>
                <ul>
                    <li><a href="/">Domů</a></li>
                    <li><a href="/archiv.html">Archiv</a></li>
                    <li><a href="/about.html">O projektu</a></li>
                </ul>
            </nav>
        </div>
    </header>
    
    <!-- Hero sekce s newsletter -->
    <section class="hero">
        <div class="hero-content">
            <h1>Věda, která vás chytne</h1>
            <p class="hero-subtitle">Nejzajímavější vědecké objevy a průlomy, srozumitelně a bez clickbaitů</p>
            <form class="hero-newsletter" id="hero-newsletter-form">
                <input type="email" placeholder="Váš email" required id="hero-email">
                <button type="submit">Odebírat newsletter</button>
            </form>
        </div>
    </section>
    
    <main class="main-container">
        <!-- Hlavní článek - dynamicky generovaný -->
        <div id="featured-article-container"></div>
        
        <!-- Glosa - dynamicky generovaná -->
        <div id="glosa-container"></div>
        
        <!-- Další články - dynamicky generované -->
        <section class="articles-section">
            <div class="section-header">
                <h2 class="section-title">Další články</h2>
            </div>
            <div class="articles-grid" id="articles-grid"></div>
        </section>
        
        <div class="archive-cta">
            <a href="/archiv.html" class="archive-btn">
                Prozkoumat celý archiv
                <span>📚</span>
            </a>
        </div>
    </main>
    
    <footer>
        <div class="footer-content">
            <div class="footer-links">
                <a href="/about.html">O projektu</a>
                <a href="/archiv.html">Archiv</a>
                <a href="/admin.html">Admin</a>
            </div>
            <p>&copy; 2025 Vědci zjistili. Věda pro všechny.</p>
        </div>
    </footer>
    
    <script src="homepage-modern.js"></script>
</body>
</html>
```

### Krok 4: JavaScript pro dynamický obsah

Vytvořte nový soubor `homepage-modern.js`:

```javascript
// Načítání dat při startu
document.addEventListener('DOMContentLoaded', async () => {
    await loadFeaturedArticle();
    await loadGlosa();
    await loadRecentArticles();
    initNewsletterForm();
});

// Načtení hlavního článku
async function loadFeaturedArticle() {
    try {
        const articles = await getArticles(1, 0); // Získat nejnovější článek
        const article = articles[0];
        
        if (!article) return;
        
        const container = document.getElementById('featured-article-container');
        const categories = {
            'medicine': 'Medicína',
            'biology': 'Biologie',
            'technology': 'Technologie',
            'physics': 'Fyzika',
            'chemistry': 'Chemie',
            'astronomy': 'Astrofyzika'
        };
        
        // Odhadnout kategorii z obsahu (nebo použít skutečnou kategorii pokud máte)
        const category = article.category || 'Věda';
        
        container.innerHTML = `
            <article class="featured-article">
                <div class="featured-image">
                    <span class="featured-badge">🔥 Nejnovější</span>
                </div>
                <div class="featured-content">
                    <h2 class="featured-title">${article.title}</h2>
                    <p class="featured-excerpt">
                        ${article.excerpt || article.content.substring(0, 300) + '...'}
                    </p>
                    <div class="featured-meta">
                        <div class="meta-info">
                            <span>📅 ${formatDate(article.published_at)}</span>
                            <span>⏱️ ${estimateReadingTime(article.content)} min čtení</span>
                            <span>🏷️ ${category}</span>
                        </div>
                        <a href="/article.html?id=${article.id}" class="read-more-btn">
                            Číst celý článek →
                        </a>
                    </div>
                </div>
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
            <div class="glosa-wrapper">
                <div class="glosa-section">
                    <div class="glosa-header">
                        <span class="glosa-label">Glosa</span>
                        <span class="glosa-date">${formatDate(glosa.created_at)}</span>
                    </div>
                    <h2 class="glosa-title">${glosa.title}</h2>
                    <div class="glosa-content">
                        ${glosa.content}
                    </div>
                    <div class="glosa-author">— ${glosa.author || 'Redakce'}</div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading glosa:', error);
    }
}

// Načtení dalších článků
async function loadRecentArticles() {
    try {
        const articles = await getArticles(6, 1); // 6 článků, přeskočit první
        const container = document.getElementById('articles-grid');
        
        if (!articles || articles.length === 0) {
            container.innerHTML = '<p>Žádné další články k zobrazení.</p>';
            return;
        }
        
        const categories = ['Biologie', 'Genetika', 'Technologie', 'Neurověda', 'Onkologie', 'Astrofyzika'];
        
        container.innerHTML = articles.map((article, index) => `
            <article class="article-card">
                <div class="article-card-image">
                    <span class="article-category">${categories[index % categories.length]}</span>
                </div>
                <div class="article-card-content">
                    <h3 class="article-card-title">${article.title}</h3>
                    <p class="article-card-excerpt">
                        ${article.excerpt || article.content.substring(0, 120) + '...'}
                    </p>
                    <div class="article-card-meta">
                        <span>${formatDate(article.published_at)}</span>
                        <a href="/article.html?id=${article.id}" class="article-link">
                            Číst dál →
                        </a>
                    </div>
                </div>
            </article>
        `).join('');
    } catch (error) {
        console.error('Error loading recent articles:', error);
    }
}

// Newsletter formulář v hero sekci
function initNewsletterForm() {
    const form = document.getElementById('hero-newsletter-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('hero-email').value;
        const button = form.querySelector('button');
        const originalText = button.textContent;
        
        try {
            button.disabled = true;
            button.textContent = 'Přihlašování...';
            
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
    return date.toLocaleDateString('cs-CZ', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function estimateReadingTime(text) {
    const wordsPerMinute = 200;
    const wordCount = text.trim().split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
}
```

### Krok 5: Responsivní úpravy

Styly již obsahují responsivní design pro mobily:
- Menu se přeskupí na mobilu
- Newsletter formulář se změní na vertikální
- Grid článků se změní na jeden sloupec
- Glosa text nebude ve dvou sloupcích

### Krok 6: Optimalizace výkonu

```javascript
// Přidat lazy loading obrázků (pokud budete mít)
function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}
```

## 🎨 Customizace

### Změna barev
V `styles-modern.css` upravte CSS proměnné:

```css
:root {
    --primary: #6366f1;        /* Hlavní barva */
    --secondary: #ec4899;       /* Akcent barva */
    --gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

### Změna animací
Upravte rychlost animací:

```css
.shape {
    animation: float 20s infinite ease-in-out; /* Změnit 20s na jinou hodnotu */
}
```

## 📱 Progressive Web App (PWA)

Pro ještě modernější dojem můžete přidat PWA podporu:

```json
// manifest.json
{
    "name": "Vědci zjistili",
    "short_name": "Vědci",
    "description": "Věda, která vás chytne",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#6366f1",
    "icons": [
        {
            "src": "/icon-192.png",
            "sizes": "192x192",
            "type": "image/png"
        }
    ]
}
```

## ✅ Checklist před spuštěním

- [ ] Záloha původních souborů
- [ ] Test na lokálním serveru
- [ ] Kontrola responsivity na mobilu
- [ ] Test všech odkazů
- [ ] Kontrola newsletter formuláře
- [ ] Test načítání článků z databáze
- [ ] Test zobrazení glosy
- [ ] Kontrola animací (nejsou příliš rušivé?)
- [ ] Test v různých prohlížečích

## 🚀 Deployment

1. **Commitněte změny do Git**
```bash
git add .
git commit -m "Moderní redesign homepage"
git push
```

2. **Deploy na produkci**
- Nahrajte soubory na hosting
- Vyčistěte cache
- Otestujte na produkci

## 🎉 Výsledek

Nový design přináší:
- **Moderní vzhled** - gradient, animace, interaktivní prvky
- **Lepší UX** - newsletter přímo v hero, čitelná typografie
- **Zachovaná jednoduchost** - čistý kód, snadná údržba
- **Wow efekt** - animované pozadí, hover efekty
- **Profesionalita** - vypadá jako moderní tech/science web

---

*Hodně štěstí s novým designem! 🚀*