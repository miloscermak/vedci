-- Aktualizace databáze pro podporu URL slugů
-- Spusťte tento kód v SQL editoru ve vašem Supabase projektu

-- Přidání slug sloupce (ostatní sloupce už existují)
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;

-- Storage bucket a RLS politiky už existují, přeskakujeme

-- Vytvoření indexu pro rychlejší vyhledávání podle slug
CREATE INDEX articles_slug_idx ON articles(slug);

-- Aktualizace existujících článků - vygenerování slugů
-- POZOR: Spusťte tento kód pouze jednou pro existující články
UPDATE articles 
SET slug = LOWER(
    REPLACE(
        REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(
                        REPLACE(
                            REPLACE(
                                REPLACE(
                                    REPLACE(
                                        REPLACE(
                                            REPLACE(
                                                REPLACE(title, 'á', 'a'),
                                                'é', 'e'
                                            ),
                                            'í', 'i'
                                        ),
                                        'ó', 'o'
                                    ), 
                                    'ú', 'u'
                                ), 
                                'ů', 'u'
                            ), 
                            'ý', 'y'
                        ), 
                        'č', 'c'
                    ), 
                    'ř', 'r'
                ), 
                'š', 's'
            ), 
            'ž', 'z'
        ), 
        ' ', '-'
    )
) 
WHERE slug IS NULL;

-- Databáze je připravena pro unikátní URL adresy článků

-- Vytvoření tabulky pro statické stránky
CREATE TABLE IF NOT EXISTS pages (
    id SERIAL PRIMARY KEY,
    page_key VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vytvoření indexu pro rychlejší vyhledávání podle klíče stránky
CREATE INDEX IF NOT EXISTS idx_pages_key ON pages(page_key);

-- Přidání výchozího obsahu pro stránku "O projektu"
INSERT INTO pages (page_key, title, content) 
VALUES (
    'about',
    'O projektu Vědci zjistili',
    '<p>Vědci zjistili je projekt Miloše Čermáka, který vznikl v rámci iniciativy Inspiruj.se. Jeho cílem je ukázat, jak může generativní AI pomáhat při popularizaci vědy – tedy převádět složité studie do srozumitelného, čtivého a někdy i zábavného jazyka.</p>

<p>Na webu pravidelně zveřejňujeme výběr těch nejzajímavějších vědeckých studií a článků z celého světa. Každá sumarizace vzniká kombinací lidského výběru a úprav s asistencí generativní umělé inteligence. AI dělá většinu práce, ale všechno projde lidskýma očima.</p>

<p>Projekt ukazuje, že AI není jen nástroj pro vývojáře, ale může být i spoluautor – třeba právě v oblasti vědecké žurnalistiky. Pomáhá nám šetřit čas, třídit informace a zároveň psát tak, aby to čtenáře bavilo.</p>

<p>Zajímá vás, jak můžete AI využít ve své profesi nebo koníčku? Přesně to učíme na našich kurzech a workshopech na <a href="https://inspiruj.se" target="_blank" rel="noopener">Inspiruj.se</a>.</p>'
) 
ON CONFLICT (page_key) DO NOTHING;

-- Nastavení RLS (Row Level Security) - volitelné
-- ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Pokud chcete veřejný přístup pro čtení (doporučeno pro tento web)
-- CREATE POLICY "Veřejné čtení stránek" ON pages FOR SELECT USING (true);

-- Pro administraci můžete vytvořit specifickou politiku
-- CREATE POLICY "Admin může editovat stránky" ON pages FOR ALL USING (auth.role() = 'admin');