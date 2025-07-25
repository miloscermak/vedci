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
            // Pošleme emaily jeden po druhém (kvůli CORS omezením)
            let sent = 0;
            let failed = 0;
            const errors = [];

            for (const email of emails) {
                try {
                    const response = await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${this.apiKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(email)
                    });

                    if (response.ok) {
                        sent++;
                        console.log(`✅ Email odeslán na ${email.to[0]}`);
                    } else {
                        failed++;
                        const errorData = await response.json().catch(() => ({}));
                        errors.push(`${email.to[0]}: ${errorData.message || 'Unknown error'}`);
                        console.error(`❌ Email neodeslán na ${email.to[0]}:`, errorData);
                    }
                } catch (emailError) {
                    failed++;
                    errors.push(`${email.to[0]}: ${emailError.message}`);
                    console.error(`❌ Chyba při odesílání na ${email.to[0]}:`, emailError);
                }

                // Malá pauza mezi emaily aby nezatížíme API
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            console.log(`📊 Výsledek: ${sent} odesláno, ${failed} neúspěšných`);

            return {
                sent: sent,
                failed: failed,
                errors: errors
            };

        } catch (error) {
            console.error('❌ Kritická chyba při odesílání newsletteru:', error);
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