-- SQL aktualizace pro email ověření (Double Opt-in)
-- Spusťte tento kód v Supabase SQL editoru

-- Přidání sloupců pro email ověření
ALTER TABLE newsletter_subscribers 
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(100) UNIQUE;

-- Nastavení verification_token pro existující záznamy
UPDATE newsletter_subscribers 
SET verification_token = gen_random_uuid()::text 
WHERE verification_token IS NULL;

-- Aktualizace existujících odběratelů - považujeme je za ověřené
UPDATE newsletter_subscribers 
SET verified = TRUE 
WHERE verified IS NULL OR verified = FALSE;

-- Vytvoření indexu pro rychlejší vyhledávání podle verification_token
CREATE INDEX IF NOT EXISTS idx_newsletter_verification ON newsletter_subscribers(verification_token);

-- Aktualizace getActiveSubscribers query - pouze ověření odběratelé
-- (Toto se implementuje v kódu, ne v SQL)