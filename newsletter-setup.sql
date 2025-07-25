-- SQL skript pro nastavení newsletter funkcionality
-- Spusťte tento kód v SQL editoru ve vašem Supabase projektu

-- Vytvoření tabulky pro newsletter subscribery
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    unsubscribe_token VARCHAR(100) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vytvoření indexů pro rychlejší vyhledávání
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter_subscribers(is_active);
CREATE INDEX IF NOT EXISTS idx_newsletter_token ON newsletter_subscribers(unsubscribe_token);

-- Vytvoření tabulky pro sledování odeslaných emailů
CREATE TABLE IF NOT EXISTS newsletter_emails (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recipients_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'sent'
);

-- Index pro rychlejší vyhledávání podle článku
CREATE INDEX IF NOT EXISTS idx_newsletter_emails_article ON newsletter_emails(article_id);

-- Funkce pro aktualizaci updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pro automatickou aktualizaci updated_at
CREATE TRIGGER update_newsletter_subscribers_updated_at 
    BEFORE UPDATE ON newsletter_subscribers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Nastavení RLS (Row Level Security) - volitelné
-- ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE newsletter_emails ENABLE ROW LEVEL SECURITY;

-- Pokud chcete veřejný přístup pro vkládání nových subscriberů (doporučeno)
-- CREATE POLICY "Veřejné přidávání subscriberů" ON newsletter_subscribers FOR INSERT WITH CHECK (true);

-- Pro administraci můžete vytvořit specifickou politiku
-- CREATE POLICY "Admin může vše s newsletter" ON newsletter_subscribers FOR ALL USING (auth.role() = 'admin');
-- CREATE POLICY "Admin může vše s newsletter emails" ON newsletter_emails FOR ALL USING (auth.role() = 'admin');