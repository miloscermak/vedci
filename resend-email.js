// Resend email služba pro newsletter
class ResendEmailService {
    constructor() {
        this.apiKey = window.RESEND_CONFIG?.apiKey;
        this.fromEmail = window.RESEND_CONFIG?.fromEmail || 'onboarding@resend.dev';
        this.fromName = window.RESEND_CONFIG?.fromName || 'Vědci zjistili';
    }

    // Ověření konfigurace
    isConfigured() {
        return !!(this.apiKey && this.apiKey.length > 0);
    }

    // Odeslání jednotlivého emailu
    async sendEmail(to, subject, htmlContent, textContent) {
        if (!this.isConfigured()) {
            throw new Error('Resend není nakonfigurován. Přidejte API klíč do config.js');
        }

        try {
            console.log(`📤 Odesílám email na ${to} s předmětem: ${subject}`);
            
            const requestBody = {
                from: `${this.fromName} <${this.fromEmail}>`,
                to: [to],
                subject: subject,
                html: htmlContent,
                text: textContent,
                headers: {
                    'List-Unsubscribe': `<mailto:unsubscribe@vedci-zjistili.cz?subject=unsubscribe>`,
                }
            };
            
            console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
            
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();
            console.log(`📨 Resend odpověď (${response.status}):`, data);

            if (!response.ok) {
                console.error('Resend API error:', data);
                throw new Error(`Resend API error: ${data.message || 'Unknown error'}`);
            }

            return {
                success: true,
                id: data.id,
                data: data
            };
        } catch (error) {
            console.error('Chyba při odesílání emailu:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Odeslání newsletteru všem odběratelům
    async sendNewsletter(article, subscribers, newsletterGenerator, onProgress) {
        console.log('🚀 Spouštím sendNewsletter');
        console.log('📧 Subscribers:', subscribers);
        console.log('📄 Article:', article);
        
        if (!this.isConfigured()) {
            throw new Error('Resend není nakonfigurován. Přidejte API klíč do config.js');
        }

        if (!subscribers || subscribers.length === 0) {
            throw new Error('Žádní odběratelé pro odeslání');
        }

        const subject = newsletterGenerator.generateSubject(article);
        console.log('📧 Subject:', subject);

        // Příprava všech emailů pro batch odeslání
        const emails = subscribers.map((subscriber, index) => {
            if (onProgress) {
                onProgress(index + 1, subscribers.length, subscriber.email);
            }

            const htmlContent = newsletterGenerator.generateEmailHTML(article, subscriber.unsubscribe_token);
            const textContent = newsletterGenerator.generateEmailText(article, subscriber.unsubscribe_token);

            return {
                from: `${this.fromName} <${this.fromEmail}>`,
                to: [subscriber.email],
                subject: subject,
                html: htmlContent,
                text: textContent,
                headers: {
                    'List-Unsubscribe': `<mailto:unsubscribe@vedci-zjistili.cz?subject=unsubscribe>`,
                }
            };
        });

        console.log(`📦 Připravil jsem ${emails.length} emailů pro odeslání`);

        try {
            // Odeslání pomocí Node.js proxy (obchází CORS)
            const response = await fetch('/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    emails: emails,
                    resendApiKey: this.apiKey
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('📨 Výsledek z Node.js proxy:', result);
            console.log('📊 Sent count:', result.sent);
            console.log('📊 Failed count:', result.failed);

            if (result.success) {
                return {
                    sent: result.sent,
                    failed: result.failed,
                    errors: result.results.filter(r => !r.success).map(r => `${r.email}: ${r.error}`)
                };
            } else {
                throw new Error(result.error || 'Unknown error from PHP proxy');
            }

        } catch (error) {
            console.error('❌ Chyba při odesílání přes PHP proxy:', error);
            throw error;
        }
    }

    // Test připojení k Resend API
    async testConnection() {
        if (!this.isConfigured()) {
            return {
                success: false,
                error: 'Resend není nakonfigurován'
            };
        }

        try {
            const response = await fetch('https://api.resend.com/domains', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                return {
                    success: true,
                    message: 'Připojení k Resend API je funkční'
                };
            } else {
                const data = await response.json();
                return {
                    success: false,
                    error: `Resend API error: ${data.message || 'Unknown error'}`
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `Chyba připojení: ${error.message}`
            };
        }
    }
}

// Export pro použití v jiných souborech
window.ResendEmailService = ResendEmailService;