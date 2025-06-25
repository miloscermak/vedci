// Databázové funkce pro práci s Supabase
class ArticleDatabase {
    constructor() {
        // Supabase client se nastaví později
        this.supabase = null;
    }

    // Inicializace Supabase klienta
    init(supabaseClient) {
        this.supabase = supabaseClient;
    }

    // Získání nejnovějšího článku pro hlavní stránku
    async getLatestArticle() {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                return null;
            }

            const { data, error } = await this.supabase
                .from('articles')
                .select('*')
                .order('date', { ascending: false })
                .limit(1);

            if (error) {
                console.error('Chyba při načítání nejnovějšího článku:', error);
                return null;
            }

            return data && data.length > 0 ? data[0] : null;
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            return null;
        }
    }

    // Získání všech článků pro archív (seřazené podle data)
    async getAllArticles() {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                return [];
            }

            const { data, error } = await this.supabase
                .from('articles')
                .select('*')
                .order('date', { ascending: false });

            if (error) {
                console.error('Chyba při načítání článků:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            return [];
        }
    }

    // Získání posledních N článků (pro související články)
    async getRecentArticles(limit = 10, excludeId = null) {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                return [];
            }

            let query = this.supabase
                .from('articles')
                .select('id, title, slug, date, excerpt')
                .order('date', { ascending: false })
                .limit(limit + (excludeId ? 1 : 0));

            const { data, error } = await query;

            if (error) {
                console.error('Chyba při načítání posledních článků:', error);
                return [];
            }

            let articles = data || [];
            
            // Vyloučení aktuálního článku pokud je zadáno excludeId
            if (excludeId) {
                articles = articles.filter(article => article.id !== excludeId);
                articles = articles.slice(0, limit);
            }

            return articles;
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            return [];
        }
    }

    // Získání konkrétního článku podle ID
    async getArticleById(id) {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                return null;
            }

            const { data, error } = await this.supabase
                .from('articles')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('Chyba při načítání článku:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            return null;
        }
    }

    // Nahrání obrázku do Supabase Storage
    async uploadImage(file) {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                return { success: false, error: 'Supabase klient není inicializován' };
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `articles/${fileName}`;

            const { data, error } = await this.supabase.storage
                .from('article-images')
                .upload(filePath, file);

            if (error) {
                console.error('Chyba při nahrávání obrázku:', error);
                return { success: false, error: error.message };
            }

            // Získání veřejné URL
            const { data: { publicUrl } } = this.supabase.storage
                .from('article-images')
                .getPublicUrl(filePath);

            return { success: true, url: publicUrl };
        } catch (error) {
            console.error('Chyba při komunikaci s storage:', error);
            return { success: false, error: error.message };
        }
    }

    // Přidání nového článku
    async addArticle(articleData) {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                return { success: false, error: 'Supabase klient není inicializován' };
            }

            const slug = this.generateSlug(articleData.title);

            const { data, error } = await this.supabase
                .from('articles')
                .insert([{
                    title: articleData.title,
                    content: articleData.content,
                    excerpt: articleData.excerpt,
                    date: articleData.date,
                    slug: slug,
                    image_url: articleData.image_url || null,
                    source_url: articleData.source_url || null,
                    source_title: articleData.source_title || null
                }])
                .select();

            if (error) {
                console.error('Chyba při přidávání článku:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            return { success: false, error: error.message };
        }
    }

    // Aktualizace existujícího článku
    async updateArticle(id, articleData) {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                return { success: false, error: 'Supabase klient není inicializován' };
            }

            const slug = this.generateSlug(articleData.title);

            const { data, error } = await this.supabase
                .from('articles')
                .update({
                    title: articleData.title,
                    content: articleData.content,
                    excerpt: articleData.excerpt,
                    date: articleData.date,
                    slug: slug,
                    image_url: articleData.image_url || null,
                    source_url: articleData.source_url || null,
                    source_title: articleData.source_title || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select();

            if (error) {
                console.error('Chyba při aktualizaci článku:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            return { success: false, error: error.message };
        }
    }

    // Smazání článku
    async deleteArticle(id) {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                return { success: false, error: 'Supabase klient není inicializován' };
            }

            const { error } = await this.supabase
                .from('articles')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Chyba při mazání článku:', error);
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            return { success: false, error: error.message };
        }
    }

    // Pomocná funkce pro formátování data
    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            timeZone: 'Europe/Prague'
        };
        return date.toLocaleDateString('cs-CZ', options);
    }

    // Pomocná funkce pro formátování data pro HTML datetime atribut
    formatDatetime(dateString) {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    }

    // Získání článku podle slug
    async getArticleBySlug(slug) {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                return null;
            }

            const { data, error } = await this.supabase
                .from('articles')
                .select('*')
                .eq('slug', slug)
                .single();

            if (error) {
                console.error('Chyba při načítání článku podle slug:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            return null;
        }
    }

    // Generování URL-friendly slug z titulku
    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[áàäâ]/g, 'a')
            .replace(/[éèëê]/g, 'e')
            .replace(/[íìïî]/g, 'i')
            .replace(/[óòöô]/g, 'o')
            .replace(/[úùüû]/g, 'u')
            .replace(/[ýÿ]/g, 'y')
            .replace(/[ň]/g, 'n')
            .replace(/[š]/g, 's')
            .replace(/[č]/g, 'c')
            .replace(/[ř]/g, 'r')
            .replace(/[ž]/g, 'z')
            .replace(/[ť]/g, 't')
            .replace(/[ď]/g, 'd')
            .replace(/[ů]/g, 'u')
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 60);
    }

    // Získání obsahu statické stránky podle klíče
    async getPageContent(pageKey) {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                return null;
            }

            const { data, error } = await this.supabase
                .from('pages')
                .select('*')
                .eq('page_key', pageKey)
                .single();

            if (error) {
                console.error('Chyba při načítání stránky:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            return null;
        }
    }

    // Aktualizace obsahu statické stránky
    async updatePageContent(pageKey, title, content) {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                return { success: false, error: 'Supabase klient není inicializován' };
            }

            const { data, error } = await this.supabase
                .from('pages')
                .update({
                    title: title,
                    content: content,
                    updated_at: new Date().toISOString()
                })
                .eq('page_key', pageKey)
                .select();

            if (error) {
                console.error('Chyba při aktualizaci stránky:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            return { success: false, error: error.message };
        }
    }
}

// Vytvoření globální instance
window.articleDB = new ArticleDatabase();