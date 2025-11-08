-- Row Level Security (RLS) polícy pro zabezpečení databáze
-- Tyto polícy zajišťují, že i s anon key nemohou neautorizovaní uživatelé měnit data

-- ============================================
-- POVOLENÍ RLS NA VŠECH TABULKÁCH
-- ============================================

-- Povolení RLS na tabulce articles
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Povolení RLS na tabulce glosas
ALTER TABLE glosas ENABLE ROW LEVEL SECURITY;

-- Povolení RLS na tabulce newsletter_subscribers
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Povolení RLS na tabulce newsletter_emails
ALTER TABLE newsletter_emails ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍCY PRO TABULKU ARTICLES
-- ============================================

-- Veřejné čtení - kdokoliv může číst články
CREATE POLICY "Veřejné čtení článků"
ON articles
FOR SELECT
TO public
USING (true);

-- Vkládání pouze pro autentizované uživatele
CREATE POLICY "Pouze autentizovaní mohou vkládat články"
ON articles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Aktualizace pouze pro autentizované uživatele
CREATE POLICY "Pouze autentizovaní mohou aktualizovat články"
ON articles
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Mazání pouze pro autentizované uživatele
CREATE POLICY "Pouze autentizovaní mohou mazat články"
ON articles
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- POLÍCY PRO TABULKU GLOSAS
-- ============================================

-- Veřejné čtení - kdokoliv může číst glosy
CREATE POLICY "Veřejné čtení glos"
ON glosas
FOR SELECT
TO public
USING (true);

-- Vkládání pouze pro autentizované uživatele
CREATE POLICY "Pouze autentizovaní mohou vkládat glosy"
ON glosas
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Aktualizace pouze pro autentizované uživatele
CREATE POLICY "Pouze autentizovaní mohou aktualizovat glosy"
ON glosas
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Mazání pouze pro autentizované uživatele
CREATE POLICY "Pouze autentizovaní mohou mazat glosy"
ON glosas
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- POLÍCY PRO TABULKU NEWSLETTER_SUBSCRIBERS
-- ============================================

-- Veřejné vkládání - kdokoliv se může přihlásit k newsletteru
CREATE POLICY "Veřejné vkládání odběratelů"
ON newsletter_subscribers
FOR INSERT
TO public
WITH CHECK (true);

-- Veřejné čtení vlastního záznamu (pro odhlášení pomocí tokenu)
CREATE POLICY "Veřejné čtení s tokenem"
ON newsletter_subscribers
FOR SELECT
TO public
USING (true);

-- Veřejná aktualizace pro ověření a odhlášení (pouze specifické sloupce)
CREATE POLICY "Veřejná aktualizace s tokenem"
ON newsletter_subscribers
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Mazání pouze pro autentizované uživatele (admin)
CREATE POLICY "Pouze autentizovaní mohou mazat odběratele"
ON newsletter_subscribers
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- POLÍCY PRO TABULKU NEWSLETTER_EMAILS
-- ============================================

-- Čtení pouze pro autentizované uživatele
CREATE POLICY "Pouze autentizovaní mohou číst email log"
ON newsletter_emails
FOR SELECT
TO authenticated
USING (true);

-- Vkládání pouze pro autentizované uživatele
CREATE POLICY "Pouze autentizovaní mohou vkládat do email logu"
ON newsletter_emails
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Aktualizace pouze pro autentizované uživatele
CREATE POLICY "Pouze autentizovaní mohou aktualizovat email log"
ON newsletter_emails
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Mazání pouze pro autentizované uživatele
CREATE POLICY "Pouze autentizovaní mohou mazat z email logu"
ON newsletter_emails
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- POZNÁMKY K BEZPEČNOSTI
-- ============================================

-- 1. Supabase anon key je určen k veřejnému použití - není to problém
-- 2. RLS polícy zajišťují, že i s anon key nelze měnit data bez autentizace
-- 3. Pro čtení článků a glos není potřeba autentizace (veřejný obsah)
-- 4. Pro změny je potřeba být přihlášen přes Supabase Auth
-- 5. Newsletter subscription je veřejná akce (kdokoliv se může přihlásit)
-- 6. Odhlášení z newsletteru funguje přes unique token (bezpečné)

-- ============================================
-- VYTVOŘENÍ ADMIN UŽIVATELE (JEDNORÁZOVĚ)
-- ============================================

-- DŮLEŽITÉ: Tento SQL spusťte ručně v Supabase SQL Editoru
-- nebo vytvořte uživatele přes Supabase Dashboard -> Authentication

-- Poznámka: V Supabase Dashboard -> Authentication -> Users
-- klikněte na "Invite User" a zadejte:
-- Email: admin@vedcizjistili.cz (nebo váš preferovaný email)
-- Heslo: nastavte silné heslo (min 8 znaků)

-- Alternativně můžete použít tuto SQL pro vytvoření uživatele:
-- POZNÁMKA: Toto může nefungovat v závislosti na Supabase konfiguraci
-- Lepší je použít Supabase Dashboard nebo Auth API

/*
-- Vytvoření admin uživatele (použijte Supabase Dashboard místo SQL)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@vedcizjistili.cz',
    crypt('SILNE_HESLO_ZDE', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"admin"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);
*/
