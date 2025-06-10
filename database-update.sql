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