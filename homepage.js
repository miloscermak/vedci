// homepage.js
document.addEventListener('DOMContentLoaded', async () => {
    // Inicializace Supabase klienta
    const { createClient } = supabase;
    window.supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    
    // Inicializace databáze třídy
    if (window.articleDB) {
        window.articleDB.init(window.supabaseClient);
    }
    
    // Kontrola URL parametrů - zobrazit článek nebo homepage
    const urlParams = new URLSearchParams(window.location.search);
    const articleSlug = urlParams.get('clanek');
    
    if (articleSlug) {
        await showArticlePage(articleSlug);
    } else {
        await showHomepage();
    }
});

// Zobrazení homepage
async function showHomepage() {
    await loadFeaturedArticle();
    await loadGlosa();
    await loadArticlesWithImages();
    await loadSimpleArticlesList();
    initNewsletterForm();
}

// Zobrazení konkrétního článku
async function showArticlePage(slug) {
    try {
        const article = await window.articleDB.getArticleBySlug(slug);
        
        if (!article) {
            showErrorPage('Článek nebyl nalezen.');
            return;
        }
        
        // Aktualizace title stránky
        document.title = `${article.title} - Vědci zjistili`;
        
        // Skrytí homepage obsahu
        const container = document.querySelector('.container');
        container.innerHTML = `
            <article class="main-article">
                <header class="article-header">
                    <time datetime="${formatDatetime(article.date)}">${formatDate(article.date)}</time>
                    <h2>${article.title}</h2>
                </header>
                <div class="article-content">
                    ${article.image_url ? 
                        `<img src="${article.image_url}" alt="${article.title}" class="article-image">` : 
                        ''
                    }
                    ${article.content}
                    ${article.source_url ? 
                        `<div class="article-source">Zdroj: <a href="${article.source_url}" target="_blank" rel="noopener">${article.source_title || article.source_url}</a></div>` : 
                        ''
                    }
                </div>
            </article>
            
            <section id="newsletter-signup" class="newsletter-signup">
                <h3>Odebírejte newsletter</h3>
                <p>Chcete, aby vám žádná studie neunikla? Pošleme vám anonci. Žádný spam, jen věda.</p>
                <form id="newsletter-form" class="newsletter-form">
                    <div class="newsletter-input-group">
                        <input type="email" id="newsletter-email" placeholder="Váš email" required>
                        <button type="submit" class="btn">Přihlásit se</button>
                    </div>
                </form>
                <div id="newsletter-message" class="newsletter-message" style="display: none;"></div>
            </section>
            
            <section id="related-articles" class="related-articles">
                <h3>Poslední články</h3>
                <ul id="related-articles-list"></ul>
                <div class="archive-link">
                    <a href="archiv.html">Více článků v archivu →</a>
                </div>
            </section>
        `;
        
        // Načtení souvisejících článků
        await loadRelatedArticles(article.id);
        
        // Inicializace newsletter formuláře pro článkovou stránku
        initNewsletterForm();
        
    } catch (error) {
        console.error('Chyba při načítání článku:', error);
        showErrorPage('Nepodařilo se načíst článek.');
    }
}

// Zobrazení chybové stránky
function showErrorPage(message) {
    const container = document.querySelector('.container');
    container.innerHTML = `
        <div style="text-align: center; padding: 4rem 2rem; color: #666;">
            <h2 style="margin-bottom: 1rem; color: #333;">${message}</h2>
            <p style="margin-bottom: 2rem;">Možná jste hledali jeden z těchto článků:</p>
            <a href="index.html" style="color: #0066cc; text-decoration: none; font-weight: 500;">← Zpět na hlavní stránku</a>
        </div>
    `;
}

// Načtení souvisejících článků pro stránku článku
async function loadRelatedArticles(currentArticleId) {
    try {
        const relatedArticles = await window.articleDB.getRecentArticles(10, currentArticleId);
        const relatedSection = document.getElementById('related-articles');
        const relatedList = document.getElementById('related-articles-list');
        
        if (relatedArticles && relatedArticles.length > 0) {
            relatedList.innerHTML = '';
            
            relatedArticles.forEach(article => {
                const listItem = document.createElement('li');
                const link = document.createElement('a');
                link.href = `index.html?clanek=${article.slug}`;
                
                // Formátování data
                const articleDate = new Date(article.date);
                const day = articleDate.getDate();
                const month = articleDate.getMonth() + 1;
                const year = articleDate.getFullYear().toString().slice(-2);
                const formattedDate = `${day}/${month}/${year}`;
                
                link.textContent = `${article.title} (${formattedDate})`;
                listItem.appendChild(link);
                relatedList.appendChild(listItem);
            });
            
            relatedSection.style.display = 'block';
        }
    } catch (error) {
        console.error('Chyba při načítání souvisejících článků:', error);
    }
}

// Načtení hlavního článku
async function loadFeaturedArticle() {
    try {
        const { data: articles, error } = await window.supabaseClient
            .from('articles')
            .select('*')
            .eq('status', 'published')
            .order('date', { ascending: false })
            .limit(1);
        
        if (error) throw error;
        
        const article = articles[0];
        if (!article) return;
        
        const container = document.getElementById('featured-article-container');
        container.classList.remove('loading');
        
        container.innerHTML = `
            <article class="featured-article">
                <div class="featured-image">
                    ${article.image_url ? 
                        `<img src="${article.image_url}" alt="${article.title}">` : 
                        '[Hlavní obrázek]'
                    }
                </div>
                <div class="article-label">Nejnovější</div>
                <h2><a href="index.html?clanek=${article.slug}">${article.title}</a></h2>
                <p class="article-excerpt">
                    ${article.excerpt || article.content.substring(0, 400) + '...'}
                </p>
                <div class="article-meta">
                    <span>${formatDate(article.date)}</span>
                    <span>•</span>
                    <span>${estimateReadingTime(article.content)} min čtení</span>
                </div>
                <a href="index.html?clanek=${article.slug}" class="read-more">Číst celý článek →</a>
            </article>
        `;
    } catch (error) {
        console.error('Error loading featured article:', error);
        const container = document.getElementById('featured-article-container');
        container.classList.remove('loading');
        container.innerHTML = '<p style="text-align: center; color: #666;">Nepodařilo se načíst hlavní článek.</p>';
    }
}

// Načtení glosy
async function loadGlosa() {
    try {
        const glosa = await window.articleDB.getActiveGlosa();
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
        container.style.display = 'block';
    } catch (error) {
        console.error('Error loading glosa:', error);
    }
}

// Načtení článků s náhledy (2. a 3. článek)
async function loadArticlesWithImages() {
    try {
        const { data: articles, error } = await window.supabaseClient
            .from('articles')
            .select('*')
            .eq('status', 'published')
            .order('date', { ascending: false })
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
                    ${article.image_url ? 
                        `<img src="${article.image_url}" alt="${article.title}">` : 
                        '[Náhled]'
                    }
                </div>
                <div class="article-with-image-content">
                    <h3><a href="index.html?clanek=${article.slug}">${article.title}</a></h3>
                    <p class="excerpt">
                        ${article.excerpt || article.content.substring(0, 150) + '...'}
                    </p>
                    <div class="meta">${formatDate(article.date)}</div>
                </div>
            </article>
        `).join('');
        
        container.style.display = 'block';
    } catch (error) {
        console.error('Error loading articles with images:', error);
    }
}

// Načtení jednoduchého seznamu článků
async function loadSimpleArticlesList() {
    try {
        const { data: articles, error } = await window.supabaseClient
            .from('articles')
            .select('*')
            .eq('status', 'published')
            .order('date', { ascending: false })
            .range(3, 10);  // Získat 4. až 11. článek
        
        if (error) throw error;
        
        const container = document.getElementById('simple-articles-list');
        container.classList.remove('loading');
        
        if (!articles || articles.length === 0) {
            container.innerHTML = '<p>Žádné další články.</p>';
            return;
        }
        
        container.innerHTML = articles.map(article => `
            <article class="article-item">
                <h3><a href="index.html?clanek=${article.slug}">${article.title}</a></h3>
                <div class="meta">${formatDate(article.date)}</div>
            </article>
        `).join('');
    } catch (error) {
        console.error('Error loading simple articles list:', error);
        const container = document.getElementById('simple-articles-list');
        container.classList.remove('loading');
        container.innerHTML = '<p>Nepodařilo se načíst články.</p>';
    }
}

// Newsletter formulář
function initNewsletterForm() {
    const form = document.getElementById('newsletter-form');
    const messageDiv = document.getElementById('newsletter-message');
    
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('newsletter-email').value;
        const button = form.querySelector('button');
        const originalText = button.textContent;
        
        try {
            button.disabled = true;
            button.textContent = 'Přihlašování...';
            
            // Použít existující funkci z database.js
            const result = await window.articleDB.addSubscriber(email);
            
            if (result.success) {
                // Odeslání ověřovacího emailu
                button.textContent = 'Odesílání ověřovacího emailu...';
                
                const sendResult = await sendVerificationEmail(email, result.verificationToken);
                
                if (sendResult.success) {
                    showNewsletterMessage(
                        'Děkujeme! Na váš email jsme poslali ověřovací odkaz. Kliknutím na něj dokončíte registraci.', 
                        'success'
                    );
                    form.reset();
                } else {
                    showNewsletterMessage(
                        'Registrace proběhla, ale nepodařilo se odeslat ověřovací email. Kontaktujte nás prosím.', 
                        'error'
                    );
                }
            } else {
                if (result.error.includes('duplicate key')) {
                    showNewsletterMessage('Tento email je již přihlášen k odběru nebo čeká na ověření.', 'error');
                } else {
                    console.error('Chyba při přihlašování:', result.error);
                    showNewsletterMessage('Nepodařilo se přihlásit k odběru. Zkuste to později.', 'error');
                }
            }
        } catch (error) {
            console.error('Newsletter subscription error:', error);
            showNewsletterMessage('Nepodařilo se přihlásit k odběru. Zkuste to později.', 'error');
        } finally {
            // Obnovení původního stavu tlačítka
            button.disabled = false;
            button.textContent = originalText;
        }
    });
}

// Odeslání ověřovacího emailu přes Netlify Functions
async function sendVerificationEmail(email, verificationToken) {
    try {
        // Inicializace newsletter generatoru pro ověřovací email
        const newsletterGen = new NewsletterGenerator();
        await newsletterGen.loadVerificationTemplate();
        
        const emailHTML = newsletterGen.generateVerificationEmailHTML(email, verificationToken);
        const emailText = newsletterGen.generateVerificationEmailText(email, verificationToken);
        const subject = newsletterGen.generateVerificationSubject();
        
        // Volání Netlify Functions (API klíč je serverside)
        const response = await fetch('/.netlify/functions/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: email,
                subject: subject,
                html: emailHTML,
                text: emailText
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Netlify Function error:', errorData);
            throw new Error(`Function error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Email sent successfully:', result);
        
        return { success: true };
        
    } catch (error) {
        console.error('Chyba při odesílání ověřovacího emailu:', error);
        return { 
            success: false, 
            error: 'Nepodařilo se odeslat ověřovací email. Zkuste to později nebo nás kontaktujte.' 
        };
    }
}

function showNewsletterMessage(message, type) {
    const messageDiv = document.getElementById('newsletter-message');
    if (!messageDiv) return;
    
    messageDiv.textContent = message;
    messageDiv.className = `newsletter-message ${type}`;
    messageDiv.style.display = 'block';
    
    // Schování zprávy po 8 sekundách (delší kvůli delší zprávě o ověření)
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 8000);
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

function formatDatetime(dateString) {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}