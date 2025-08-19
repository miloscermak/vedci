// Inicializace Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Inicializace databázové třídy
window.articleDB.init(supabaseClient);

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
        const article = await window.articleDB.getLatestArticle();
        
        if (!article) {
            document.getElementById('featured-article-container').innerHTML = 
                '<p class="text-center">Žádný článek k zobrazení.</p>';
            return;
        }
        
        const container = document.getElementById('featured-article-container');
        
        // Kategorie - můžeme je odhadnout z obsahu nebo použít fallback
        const categories = {
            'covid': 'Medicína',
            'vakcín': 'Medicína', 
            'genom': 'Genetika',
            'DNA': 'Genetika',
            'robot': 'Technologie',
            'AI': 'Technologie',
            'kvant': 'Fyzika',
            'částic': 'Fyzika',
            'molekul': 'Chemie',
            'planet': 'Astronomie',
            'hvězd': 'Astronomie'
        };
        
        let category = 'Věda';
        for (const [keyword, cat] of Object.entries(categories)) {
            if (article.title.includes(keyword) || article.content.includes(keyword)) {
                category = cat;
                break;
            }
        }
        
        container.innerHTML = `
            <article class="featured-article">
                ${article.image_url ? `
                    <div class="featured-image" style="background-image: url('${article.image_url}'); background-size: cover; background-position: center;">
                        <span class="featured-badge">🔥 Nejnovější</span>
                    </div>
                ` : `
                    <div class="featured-image">
                        <span class="featured-badge">🔥 Nejnovější</span>
                    </div>
                `}
                <div class="featured-content">
                    <h2 class="featured-title">${article.title}</h2>
                    <p class="featured-excerpt">
                        ${article.excerpt || article.content.substring(0, 300).replace(/<[^>]*>/g, '') + '...'}
                    </p>
                    <div class="featured-meta">
                        <div class="meta-info">
                            <span>📅 ${formatDate(article.date)}</span>
                            <span>⏱️ ${estimateReadingTime(article.content)} min čtení</span>
                            <span>🏷️ ${category}</span>
                        </div>
                        <a href="/?clanek=${article.slug}" class="read-more-btn">
                            Číst celý článek →
                        </a>
                    </div>
                </div>
            </article>
        `;
    } catch (error) {
        console.error('Error loading featured article:', error);
        document.getElementById('featured-article-container').innerHTML = 
            '<p class="text-center">Chyba při načítání článku.</p>';
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
        document.getElementById('glosa-container').style.display = 'none';
    }
}

// Načtení dalších článků
async function loadRecentArticles() {
    try {
        const latestArticle = await window.articleDB.getLatestArticle();
        const articles = await window.articleDB.getRecentArticles(7, latestArticle?.id);
        
        const container = document.getElementById('articles-grid');
        
        if (!articles || articles.length === 0) {
            container.innerHTML = '<p class="text-center">Žádné další články k zobrazení.</p>';
            return;
        }
        
        // Omezit na 6 článků
        const articlesToShow = articles.slice(0, 6);
        
        // Kategorie pro zobrazení
        const categoryColors = {
            'Biologie': '#10b981',
            'Genetika': '#8b5cf6', 
            'Technologie': '#3b82f6',
            'Neurověda': '#f59e0b',
            'Medicína': '#ef4444',
            'Astronomie': '#6366f1'
        };
        
        const categories = Object.keys(categoryColors);
        
        container.innerHTML = articlesToShow.map((article, index) => {
            const category = categories[index % categories.length];
            const categoryColor = categoryColors[category];
            
            return `
                <article class="article-card">
                    ${article.image_url ? `
                        <div class="article-card-image" style="background-image: url('${article.image_url}'); background-size: cover; background-position: center;">
                            <span class="article-category" style="background: ${categoryColor}; color: white;">${category}</span>
                        </div>
                    ` : `
                        <div class="article-card-image">
                            <span class="article-category" style="background: ${categoryColor}; color: white;">${category}</span>
                        </div>
                    `}
                    <div class="article-card-content">
                        <h3 class="article-card-title">${article.title}</h3>
                        <p class="article-card-excerpt">
                            ${article.excerpt || 'Přečtěte si nejnovější vědecký objev...'}
                        </p>
                        <div class="article-card-meta">
                            <span>${formatDate(article.date)}</span>
                            <a href="/?clanek=${article.slug}" class="article-link">
                                Číst dál →
                            </a>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading recent articles:', error);
        document.getElementById('articles-grid').innerHTML = 
            '<p class="text-center">Chyba při načítání článků.</p>';
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
            
            // Přidání subscribera
            const result = await window.articleDB.addSubscriber(email);
            
            if (result.success) {
                button.textContent = '✓ Přihlášeno!';
                button.style.background = '#10b981';
                form.reset();
                
                // Zobrazit informaci o potvrzovacím emailu
                alert('Děkujeme za přihlášení! Na váš email jsme poslali potvrzovací odkaz.');
                
                setTimeout(() => {
                    button.textContent = originalText;
                    button.disabled = false;
                    button.style.background = '';
                }, 3000);
            } else {
                throw new Error(result.error || 'Chyba při přihlašování');
            }
        } catch (error) {
            console.error('Newsletter subscription error:', error);
            
            if (error.message.includes('duplicate')) {
                alert('Tento email je již přihlášen k odběru newsletteru.');
            } else {
                alert('Chyba při přihlašování. Zkuste to prosím později.');
            }
            
            button.textContent = originalText;
            button.disabled = false;
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
    const plainText = text.replace(/<[^>]*>/g, ''); // Odstranit HTML tagy
    const wordCount = plainText.trim().split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
}

// Smooth scroll pro navigaci
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Animace při scrollu
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Aplikovat animace na karty
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        document.querySelectorAll('.article-card').forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'all 0.6s ease';
            observer.observe(card);
        });
    }, 100);
});