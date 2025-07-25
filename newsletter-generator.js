// Newsletter generator funkce
class NewsletterGenerator {
    constructor() {
        this.template = null;
        this.verificationTemplate = null;
        this.websiteUrl = window.location.origin;
    }

    // Načtení email template
    async loadTemplate() {
        try {
            const response = await fetch('newsletter-template.html');
            if (!response.ok) {
                throw new Error('Nepodařilo se načíst email template');
            }
            this.template = await response.text();
            return true;
        } catch (error) {
            console.error('Chyba při načítání template:', error);
            return false;
        }
    }

    // Načtení ověřovacího email template
    async loadVerificationTemplate() {
        try {
            const response = await fetch('verification-email-template.html');
            if (!response.ok) {
                throw new Error('Nepodařilo se načíst ověřovací template');
            }
            this.verificationTemplate = await response.text();
            return true;
        } catch (error) {
            console.error('Chyba při načítání ověřovacího template:', error);
            return false;
        }
    }

    // Generování HTML emailu pro článek
    generateEmailHTML(article, unsubscribeToken) {
        if (!this.template) {
            console.error('Template není načten');
            return null;
        }

        // Formátování data
        const articleDate = new Date(article.date);
        const formattedDate = articleDate.toLocaleDateString('cs-CZ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Vytvoření URL pro článek
        const articleUrl = `${this.websiteUrl}/index.html?clanek=${article.slug}`;
        
        // Vytvoření URL pro odhlášení
        const unsubscribeUrl = `${this.websiteUrl}/unsubscribe.html?token=${unsubscribeToken}`;

        // Příprava source informace
        let sourceInfo = '';
        if (article.source_url && article.source_title) {
            sourceInfo = `Zdroj: <a href="${article.source_url}" target="_blank" rel="noopener">${article.source_title}</a>`;
        } else if (article.source_url) {
            sourceInfo = `Zdroj: <a href="${article.source_url}" target="_blank" rel="noopener">${article.source_url}</a>`;
        }

        // Nahrazení placeholderů v template
        let emailHTML = this.template
            .replace(/\{\{website_url\}\}/g, this.websiteUrl)
            .replace(/\{\{article_title\}\}/g, this.escapeHtml(article.title))
            .replace(/\{\{article_date\}\}/g, formattedDate)
            .replace(/\{\{article_excerpt\}\}/g, article.excerpt)
            .replace(/\{\{article_url\}\}/g, articleUrl)
            .replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl);

        // Podmíněné nahrazení obrázku
        if (article.image_url) {
            emailHTML = emailHTML
                .replace(/\{\{#if article_image\}\}/g, '')
                .replace(/\{\{\/if\}\}/g, '')
                .replace(/\{\{article_image\}\}/g, article.image_url);
        } else {
            // Odstranění sekce s obrázkem
            emailHTML = emailHTML.replace(/\{\{#if article_image\}\}[\s\S]*?\{\{\/if\}\}/g, '');
        }

        // Podmíněné nahrazení source informace
        if (sourceInfo) {
            emailHTML = emailHTML
                .replace(/\{\{#if source_info\}\}/g, '')
                .replace(/\{\{source_info\}\}/g, sourceInfo);
        } else {
            // Odstranění sekce se zdrojem
            emailHTML = emailHTML.replace(/\{\{#if source_info\}\}[\s\S]*?\{\{\/if\}\}/g, '');
        }

        return emailHTML;
    }

    // Generování textové verze emailu
    generateEmailText(article, unsubscribeToken) {
        const articleDate = new Date(article.date);
        const formattedDate = articleDate.toLocaleDateString('cs-CZ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const articleUrl = `${this.websiteUrl}/index.html?clanek=${article.slug}`;
        const unsubscribeUrl = `${this.websiteUrl}/unsubscribe.html?token=${unsubscribeToken}`;

        let textEmail = `VĚDCI ZJISTILI - ${article.title}\n\n`;
        textEmail += `${formattedDate}\n\n`;
        textEmail += `${this.stripHtml(article.excerpt)}\n\n`;
        textEmail += `Číst celý článek: ${articleUrl}\n\n`;

        if (article.source_url && article.source_title) {
            textEmail += `Zdroj: ${article.source_title} (${article.source_url})\n\n`;
        } else if (article.source_url) {
            textEmail += `Zdroj: ${article.source_url}\n\n`;
        }

        textEmail += `---\n`;
        textEmail += `© 2025 Vědci zjistili. Každý den něco nového.\n`;
        textEmail += `Tento email jste obdrželi, protože jste se přihlásili k odběru newsletteru na webu Vědci zjistili.\n`;
        textEmail += `Odhlásit se z odběru: ${unsubscribeUrl}`;

        return textEmail;
    }

    // Pomocná funkce pro escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Pomocná funkce pro odstranění HTML tagů
    stripHtml(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    // Generování subject řádku
    generateSubject(article) {
        return `Vědci zjistili: ${article.title}`;
    }

    // Generování ověřovacího emailu
    generateVerificationEmailHTML(email, verificationToken) {
        if (!this.verificationTemplate) {
            console.error('Ověřovací template není načten');
            return null;
        }

        const verificationUrl = `${this.websiteUrl}/verify-email.html?token=${verificationToken}`;

        const emailHTML = this.verificationTemplate
            .replace(/\{\{website_url\}\}/g, this.websiteUrl)
            .replace(/\{\{verification_url\}\}/g, verificationUrl);

        return emailHTML;
    }

    // Generování textové verze ověřovacího emailu
    generateVerificationEmailText(email, verificationToken) {
        const verificationUrl = `${this.websiteUrl}/verify-email.html?token=${verificationToken}`;

        return `
VĚDCI ZJISTILI - Ověření emailové adresy

Děkujeme za přihlášení k odběru newsletteru Vědci zjistili!

Pro dokončení registrace a začátek odběru nejnovějších vědeckých objevů prosím navštivte tento odkaz:

${verificationUrl}

Tento odkaz vyprší za 24 hodin. Pokud jste se nepřihlašovali k odběru newsletteru, tento email ignorujte.

---
© 2025 Vědci zjistili. Každý den něco nového.
        `.trim();
    }

    // Subject pro ověřovací email
    generateVerificationSubject() {
        return 'Ověřte svou emailovou adresu - Vědci zjistili';
    }
}

// Export pro použití v jiných souborech
window.NewsletterGenerator = NewsletterGenerator;