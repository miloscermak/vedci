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

    // Newsletter funkce - Získání všech aktivních subscriberů
    async getActiveSubscribers() {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                return [];
            }

            const { data, error } = await this.supabase
                .from('newsletter_subscribers')
                .select('email, unsubscribe_token')
                .eq('is_active', true)
                .eq('is_verified', true);

            if (error) {
                console.error('Chyba při načítání subscriberů:', error);
                return [];
            }

            console.log('🔍 Načetl jsem ověřené aktivní subscribery z DB:', data);
            return data || [];
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            return [];
        }
    }

    // Newsletter funkce - Přidání nového subscribera (neověřeného)
    async addSubscriber(email) {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                return { success: false, error: 'Supabase klient není inicializován' };
            }

            // Generování verification tokenu
            const verificationToken = crypto.randomUUID();

            const { data, error } = await this.supabase
                .from('newsletter_subscribers')
                .insert([{
                    email: email,
                    is_verified: false,
                    verification_token: verificationToken,
                    is_active: true
                }])
                .select();

            if (error) {
                console.error('Chyba při přidávání subscribera:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data: data[0], verificationToken: verificationToken };
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            return { success: false, error: error.message };
        }
    }

    // Newsletter funkce - Odhlášení subscribera pomocí tokenu
    async unsubscribe(token) {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                return { success: false, error: 'Supabase klient není inicializován' };
            }

            const { data, error } = await this.supabase
                .from('newsletter_subscribers')
                .update({ is_active: false })
                .eq('unsubscribe_token', token)
                .select();

            if (error) {
                console.error('Chyba při odhlašování:', error);
                return { success: false, error: error.message };
            }

            if (!data || data.length === 0) {
                return { success: false, error: 'Neplatný token' };
            }

            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            return { success: false, error: error.message };
        }
    }

    // Newsletter funkce - Zaznamenání odeslaného emailu
    async logNewsletterEmail(articleId, subject, recipientsCount) {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                return { success: false, error: 'Supabase klient není inicializován' };
            }

            const { data, error } = await this.supabase
                .from('newsletter_emails')
                .insert([{
                    article_id: articleId,
                    subject: subject,
                    recipients_count: recipientsCount
                }])
                .select();

            if (error) {
                console.error('Chyba při zaznamenávání emailu:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            return { success: false, error: error.message };
        }
    }

    // Newsletter funkce - Získání statistik
    async getNewsletterStats() {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                return null;
            }

            const { data: subscribersData, error: subscribersError } = await this.supabase
                .from('newsletter_subscribers')
                .select('is_active');

            if (subscribersError) {
                console.error('Chyba při načítání statistik subscriberů:', subscribersError);
                return null;
            }

            const { data: emailsData, error: emailsError } = await this.supabase
                .from('newsletter_emails')
                .select('recipients_count');

            if (emailsError) {
                console.error('Chyba při načítání statistik emailů:', emailsError);
                return null;
            }

            const totalSubscribers = subscribersData ? subscribersData.length : 0;
            const activeSubscribers = subscribersData ? subscribersData.filter(s => s.is_active).length : 0;
            const totalEmailsSent = emailsData ? emailsData.length : 0;
            const totalRecipients = emailsData ? emailsData.reduce((sum, email) => sum + (email.recipients_count || 0), 0) : 0;

            return {
                totalSubscribers,
                activeSubscribers,
                totalEmailsSent,
                totalRecipients
            };
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            return null;
        }
    }

    // Newsletter funkce - Získání všech odběratelů pro admin
    async getAllSubscribers() {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                return [];
            }

            const { data, error } = await this.supabase
                .from('newsletter_subscribers')
                .select('id, email, subscribed_at, is_active, verified')
                .order('subscribed_at', { ascending: false });

            if (error) {
                console.error('Chyba při načítání všech subscriberů:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            return [];
        }
    }

    // Newsletter funkce - Ověření emailu pomocí tokenu
    async verifyEmail(verificationToken) {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                return { success: false, error: 'Supabase klient není inicializován' };
            }

            const { data, error } = await this.supabase
                .from('newsletter_subscribers')
                .update({
                    is_verified: true,
                    verified_at: new Date().toISOString(),
                    verification_token: null // Token už nepotřebujeme
                })
                .eq('verification_token', verificationToken)
                .eq('is_verified', false) // Jen neověřené
                .select();

            if (error) {
                console.error('Chyba při ověřování emailu:', error);
                return { success: false, error: error.message };
            }

            if (!data || data.length === 0) {
                return { success: false, error: 'Neplatný nebo již použitý ověřovací token' };
            }

            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            return { success: false, error: error.message };
        }
    }

    // Newsletter funkce - Smazání odběratele
    async deleteSubscriber(subscriberId) {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                return { success: false, error: 'Supabase klient není inicializován' };
            }

            const { error } = await this.supabase
                .from('newsletter_subscribers')
                .delete()
                .eq('id', subscriberId);

            if (error) {
                console.error('Chyba při mazání subscribera:', error);
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            return { success: false, error: error.message };
        }
    }

    // Newsletter funkce - Aktivace/deaktivace odběratele
    async toggleSubscriber(subscriberId, isActive) {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                return { success: false, error: 'Supabase klient není inicializován' };
            }

            const { data, error } = await this.supabase
                .from('newsletter_subscribers')
                .update({ is_active: isActive })
                .eq('id', subscriberId)
                .select();

            if (error) {
                console.error('Chyba při změně stavu subscribera:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            return { success: false, error: error.message };
        }
    }

    // Newsletter funkce - Přidání odběratele z admin (bez ověření)
    async addSubscriberAdmin(email) {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                return { success: false, error: 'Supabase klient není inicializován' };
            }

            const { data, error } = await this.supabase
                .from('newsletter_subscribers')
                .insert([{ 
                    email: email,
                    is_active: true 
                }])
                .select();

            if (error) {
                console.error('Chyba při přidávání subscribera z admin:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            return { success: false, error: error.message };
        }
    }
    // ========== FUNKCE PRO GLOSY ==========

    // Získat aktivní glosu
    async getActiveGlosa() {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                return null;
            }

            const { data, error } = await this.supabase
                .from('glosas')
                .select('*')
                .eq('is_active', true)
                .single();
            
            if (error && error.code !== 'PGRST116') { // Ignorovat "no rows" error
                console.error('Error fetching active glosa:', error);
                return null;
            }
            return data;
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            return null;
        }
    }

    // Získat všechny glosy
    async getAllGlosas() {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                return [];
            }

            const { data, error } = await this.supabase
                .from('glosas')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Error fetching glosas:', error);
                return [];
            }
            return data || [];
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            return [];
        }
    }

    // Vytvořit novou glosu
    async createGlosa(glosaData) {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                return { success: false, error: 'Supabase klient není inicializován' };
            }

            // Spočítat počet slov z plain text verze
            const wordCount = glosaData.content_plain ? 
                glosaData.content_plain.trim().split(/\s+/).length : 0;
            
            const { data, error } = await this.supabase
                .from('glosas')
                .insert([{
                    ...glosaData,
                    word_count: wordCount
                }])
                .select()
                .single();
            
            if (error) {
                console.error('Error creating glosa:', error);
                throw error;
            }
            return data;
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            throw error;
        }
    }

    // Aktualizovat glosu
    async updateGlosa(id, updates) {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                throw new Error('Supabase klient není inicializován');
            }

            // Pokud se aktualizuje obsah, přepočítat počet slov
            if (updates.content_plain) {
                updates.word_count = updates.content_plain.trim().split(/\s+/).length;
            }
            
            const { data, error } = await this.supabase
                .from('glosas')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            
            if (error) {
                console.error('Error updating glosa:', error);
                throw error;
            }
            return data;
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            throw error;
        }
    }

    // Smazat glosu
    async deleteGlosa(id) {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                throw new Error('Supabase klient není inicializován');
            }

            const { error } = await this.supabase
                .from('glosas')
                .delete()
                .eq('id', id);
            
            if (error) {
                console.error('Error deleting glosa:', error);
                throw error;
            }
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            throw error;
        }
    }

    // Nastavit glosu jako aktivní
    async setActiveGlosa(id) {
        try {
            if (!this.supabase) {
                console.error('Supabase klient není inicializován');
                throw new Error('Supabase klient není inicializován');
            }

            const { error } = await this.supabase
                .from('glosas')
                .update({ is_active: true })
                .eq('id', id);
            
            if (error) {
                console.error('Error setting active glosa:', error);
                throw error;
            }
        } catch (error) {
            console.error('Chyba při komunikaci s databází:', error);
            throw error;
        }
    }
}

// Vytvoření globální instance
window.articleDB = new ArticleDatabase();