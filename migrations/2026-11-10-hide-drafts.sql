-- Skrytí konceptů článků před veřejností
--
-- Proč: politika "Veřejné čtení článků" pouštěla ke čtení všechny řádky.
-- Web koncepty odfiltroval až v prohlížeči, takže přímým dotazem do databáze
-- si je mohl přečíst kdokoli. Nově veřejnost vidí jen publikované články,
-- přihlášený admin všechno. Netlify funkce používají service role klíč,
-- kterého se RLS netýká.
--
-- Skript lze spustit opakovaně.

DROP POLICY IF EXISTS "Veřejné čtení článků" ON articles;
DROP POLICY IF EXISTS "Veřejné čtení publikovaných článků" ON articles;
DROP POLICY IF EXISTS "Přihlášení čtou všechny články" ON articles;

CREATE POLICY "Veřejné čtení publikovaných článků"
ON articles
FOR SELECT
USING (status = 'published');

CREATE POLICY "Přihlášení čtou všechny články"
ON articles
FOR SELECT
TO authenticated
USING (true);
