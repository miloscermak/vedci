-- SQL skript pro nastavení Supabase databáze
-- Spusťte tento kód v SQL editoru ve vašem Supabase projektu

-- Vytvoření tabulky pro články
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    excerpt VARCHAR(1000) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vytvoření indexu pro rychlejší vyhledávání podle data
CREATE INDEX idx_articles_date ON articles(date DESC);

-- Tabulka articles je připravena pro vaše vlastní články

-- Nastavení RLS (Row Level Security) - volitelné
-- ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Pokud chcete veřejný přístup pro čtení (doporučeno pro tento web)
-- CREATE POLICY "Veřejné čtení článků" ON articles FOR SELECT USING (true);

-- Pro administraci můžete vytvořit specifickou politiku
-- CREATE POLICY "Admin může vše" ON articles FOR ALL USING (auth.role() = 'admin');