-- ============================================================
-- Draft pipeline migrace
-- Datum: 2026-05-01
-- Účel: zavést draft/published workflow v admin editoru.
-- ============================================================
--
-- POSTUP:
-- 1) Otevřete Supabase → Project → SQL Editor.
-- 2) Vložte celý tento soubor a klikněte Run.
-- 3) Po úspěšném proběhnutí ověřte v Table Editor → articles,
--    že existují sloupce status, image_prompt, study_source,
--    published_at, generated_by a všechny existující články
--    mají status = 'published'.
-- 4) Migraci pouštějte JEN JEDNOU. Příkazy jsou idempotentní
--    (IF NOT EXISTS), ale zbytečně by se logovaly.
-- ============================================================

-- 1) Sloupec status: 'draft' nebo 'published'
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'draft';

-- 2) Sloupec image_prompt: ulož prompt, kterým se obrázek vyrobil
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS image_prompt TEXT;

-- 3) Sloupec study_source: surový text/URL/PDF link, ze kterého draft vznikl
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS study_source TEXT;

-- 4) Sloupec published_at: kdy byl článek skutečně zveřejněn
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

-- 5) Sloupec generated_by: 'ai' (Claude pipeline), 'human' (ruční), 'cowork' (z Coworku)
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS generated_by VARCHAR(20);

-- 6) Backfill: všechny existující články jsou publikované, čas publikace = create
UPDATE articles
SET status = 'published',
    published_at = COALESCE(published_at, created_at)
WHERE status = 'draft' AND created_at IS NOT NULL;

-- 7) Index pro rychlé filtrování status (homepage, archiv, newsletter)
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_status_date ON articles(status, date DESC);

-- 8) Volitelný check constraint: status musí být jedna ze známých hodnot
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'articles_status_check'
        AND table_name = 'articles'
    ) THEN
        ALTER TABLE articles
        ADD CONSTRAINT articles_status_check
        CHECK (status IN ('draft', 'published'));
    END IF;
END $$;

-- ============================================================
-- Hotovo. Pokud chcete ověřit migraci, spusťte:
--   SELECT status, count(*) FROM articles GROUP BY status;
-- ============================================================
