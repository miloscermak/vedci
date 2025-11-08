# Bezpečnostní Setup - Vědci zjistili

Tato příručka popisuje bezpečnostní vylepšení implementovaná v projektu a kroky potřebné k jejich nasazení.

## 🔒 Implementovaná bezpečnostní vylepšení

### 1. Odstranění hardcoded credentials
- ✅ Odstraněny hardcoded admin credentials z `admin.html`
- ✅ Implementována Supabase Auth pro skutečnou autentizaci
- ✅ Vytvořen `auth.js` pro správu autentizace

### 2. Row Level Security (RLS)
- ✅ RLS policies pro všechny databázové tabulky
- ✅ Veřejné čtení článků a glos
- ✅ Zápis pouze pro autentizované uživatele
- ✅ Specifické policies pro newsletter subscribers

### 3. Zabezpečení serverless funkcí
- ✅ `send-newsletter.js` - vyžaduje autentizaci
- ✅ `send-email.js` - rate limiting (5 req/min na IP)
- ✅ Auth middleware s JWT ověřením

### 4. Environment variables
- ✅ `.env.example` šablona
- ✅ `.env` soubor (gitignored)
- ✅ Supabase credentials připraveny pro environment variables

---

## 🚀 Setup pro produkci (krok za krokem)

### Krok 1: Nastavení Supabase projektu

1. **Přihlaste se do Supabase Dashboard**
   - Jděte na https://supabase.com/dashboard
   - Otevřete váš projekt `vedcizjistili`

2. **Aplikujte RLS polícy**
   - V Supabase Dashboard jděte do **SQL Editor**
   - Otevřete soubor `database/06-enable-rls.sql`
   - Zkopírujte obsah a vložte do SQL Editoru
   - Klikněte na **Run** pro aplikování polícy

3. **Ověřte RLS**
   - Jděte do **Database** → **Tables**
   - U každé tabulky (articles, glosas, newsletter_subscribers, newsletter_emails) by mělo být vidět:
     - 🔒 RLS enabled: **Yes**
     - Polícy: několik politik pro SELECT, INSERT, UPDATE, DELETE

### Krok 2: Vytvoření admin účtu

**Možnost A: Pomocí setup-admin.html (doporučeno)**

1. Otevřete v prohlížeči: `http://localhost:8000/setup-admin.html`
2. Vyplňte:
   - Email: `milos@vedcizjistili.cz` (nebo váš preferovaný)
   - Heslo: alespoň 8 znaků (použijte silné heslo!)
3. Klikněte **Vytvořit Admin Účet**
4. **DŮLEŽITÉ: Po vytvoření účtu SMAŽTE `setup-admin.html`**

**Možnost B: Přes Supabase Dashboard**

1. V Supabase Dashboard jděte do **Authentication** → **Users**
2. Klikněte na **Invite User**
3. Zadejte:
   - Email: `milos@vedcizjistili.cz`
   - Heslo: vaše silné heslo
4. Klikněte **Invite**

**Možnost C: Ručně přes SQL** (nejméně doporučeno)

```sql
-- V Supabase SQL Editoru
-- POZOR: Tento přístup může nefungovat v závislosti na konfiguraci
-- Lepší je použít možnost A nebo B
```

### Krok 3: Nastavení Netlify environment variables

1. **Přihlaste se do Netlify Dashboard**
   - https://app.netlify.com
   - Vyberte váš projekt `vedcizjistili`

2. **Jděte do Site settings → Environment variables**

3. **Přidejte následující proměnné:**

   ```
   SUPABASE_URL=https://qcwuieppccnozzcsjlxy.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   RESEND_API_KEY=re_your_actual_api_key_here
   ```

   **Kde najít tyto hodnoty:**
   - `SUPABASE_URL` a `SUPABASE_ANON_KEY`: Supabase Dashboard → Settings → API
   - `RESEND_API_KEY`: Resend.com → API Keys

4. **Klikněte Save**

5. **Re-deploy aplikace** (Netlify použije nové proměnné)

### Krok 4: Test autentizace

1. **Otevřete admin panel**
   - https://vedcizjistili.cz/admin.html
   - NEBO lokálně: http://localhost:8000/admin.html

2. **Přihlaste se**
   - Email: email který jste použili v kroku 2
   - Heslo: heslo které jste nastavili

3. **Ověřte funkčnost:**
   - ✅ Měli byste se přihlásit úspěšně
   - ✅ Měli byste vidět admin obsah
   - ✅ Měli byste být schopni vytvořit/editovat články
   - ✅ Měli byste být schopni odeslat newsletter

4. **Otestujte odhlášení**
   - Klikněte na tlačítko **Odhlásit se**
   - Měli byste být přesměrováni na přihlašovací stránku

### Krok 5: Test bezpečnosti

**Test 1: RLS polícy**
1. Otevřete konzoli prohlížeče (F12)
2. Zkuste přímo volat Supabase API bez autentizace:
   ```javascript
   const { createClient } = supabase;
   const client = createClient('YOUR_URL', 'YOUR_ANON_KEY');

   // Pokuste se vložit článek
   const { data, error } = await client
     .from('articles')
     .insert([{ title: 'Test', content: 'Test' }]);

   console.log(error); // Mělo by zobrazit chybu o nedostatečných právech
   ```
3. Měli byste dostat chybu - RLS blokuje neautentizované zápisy ✅

**Test 2: Serverless funkce autentizace**
1. Zkuste volat send-newsletter bez autentizace:
   ```javascript
   fetch('/.netlify/functions/send-newsletter', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ emails: [] })
   })
   .then(r => r.json())
   .then(console.log);
   ```
2. Měli byste dostat 401 Unauthorized ✅

**Test 3: Rate limiting**
1. Zkuste odeslat více než 5 požadavků na send-email za minutu
2. Po 5. požadavku byste měli dostat 429 Too Many Requests ✅

---

## 📋 Checklist pro produkční nasazení

- [ ] RLS polícy aplikovány v Supabase
- [ ] Admin účet vytvořen
- [ ] `setup-admin.html` smazán nebo přejmenován
- [ ] Environment variables nastaveny v Netlify
- [ ] RESEND_API_KEY nastaven (skutečný klíč, ne placeholder)
- [ ] Test přihlášení do admin panelu úspěšný
- [ ] Test RLS politik úspěšný
- [ ] Test autentizace serverless funkcí úspěšný
- [ ] Test rate limitingu úspěšný
- [ ] `.env` soubor NENÍ v Git repozitáři (je v .gitignore)

---

## 🔐 Bezpečnostní doporučení

### Silné heslo
- Minimálně 12 znaků
- Kombinace velkých/malých písmen, číslic a speciálních znaků
- Nepoužívat stejné heslo jako jinde
- Zvažte použití password manageru (1Password, Bitwarden)

### Supabase bezpečnost
- **Anon key je VEŘEJNÝ** - není to problém, RLS polícy chrání data
- **Service role key je TAJNÝ** - NIKDY ho nedávejte do frontendu
- Pravidelně kontrolujte Supabase audit logs

### Netlify bezpečnost
- Environment variables jsou bezpečně uloženy
- Nejsou dostupné v prohlížeči
- Jsou dostupné pouze v serverless funkcích

### Rate limiting
- Send-email: 5 požadavků za minutu na IP
- Pro produkci zvažte Redis pro distribuované rate limiting
- Monitorujte logy pro podezřelou aktivitu

### Monitoring
- Kontrolujte Supabase logs pro neúspěšné přihlášení
- Kontrolujte Netlify Function logs pro chyby
- Nastavte upozornění pro podezřelou aktivitu

---

## 🛠️ Lokální vývoj

### Spuštění lokálního serveru
```bash
npm install
npm start
# nebo
node server.js
```

### Použití .env souboru
Lokální `.env` soubor je již vytvořen s vašimi Supabase credentials.
**Nikdy ho necommitujte do Gitu!** (Je v .gitignore)

### Test autentizace lokálně
1. Otevřete http://localhost:8000/admin.html
2. Přihlaste se pomocí Supabase účtu
3. Vše by mělo fungovat stejně jako na produkci

---

## 🆘 Troubleshooting

### Problém: Nelze se přihlásit do admin panelu
**Řešení:**
1. Zkontrolujte konzoli prohlížeče (F12) pro chyby
2. Ověřte že Supabase credentials jsou správné v `config.js`
3. Zkontrolujte že účet existuje v Supabase Dashboard → Authentication → Users
4. Zkuste reset hesla pomocí "Forgot password" (pokud implementováno)

### Problém: 401 Unauthorized při odesílání newsletteru
**Řešení:**
1. Zkontrolujte že jste přihlášeni
2. Obnovte stránku a přihlaste se znovu
3. Zkontrolujte Netlify Function logs pro detaily

### Problém: 429 Too Many Requests
**Řešení:**
- Toto je normální - rate limiting funguje
- Počkejte 1 minutu a zkuste znovu
- Pro testování můžete dočasně zvýšit limit v `auth-middleware.js`

### Problém: RLS blokuje i moje admin operace
**Řešení:**
1. Zkontrolujte že jste přihlášeni
2. RLS polícy kontrolují JWT token
3. Zkontrolujte konzoli prohlížeče pro auth errors
4. Zkuste se odhlásit a přihlásit znovu

### Problém: Environment variables nejsou dostupné
**Řešení:**
1. V Netlify Dashboard zkontrolujte Site settings → Environment variables
2. Po změně env vars je potřeba re-deploy
3. Pro lokální vývoj použijte `.env` soubor

---

## 📚 Další kroky

### Doporučená vylepšení:
1. **Email verifikace** - Vyžadovat ověření emailu před aktivací účtu
2. **2FA** - Two-factor authentication pro admin účet
3. **Audit logs** - Logování všech admin operací
4. **IP whitelisting** - Omezit admin přístup na specifické IP
5. **Session timeout** - Automatické odhlášení po nečinnosti
6. **CSRF protection** - Pro dodatečnou ochranu

### Monitoring a analytics:
1. Nastavit Sentry pro error tracking
2. Implementovat custom analytics pro admin akce
3. Regular security audits

---

## 📞 Podpora

Pro otázky nebo problémy:
1. Zkontrolujte tuto dokumentaci
2. Zkontrolujte Supabase dokumentaci: https://supabase.com/docs
3. Zkontrolujte Netlify dokumentaci: https://docs.netlify.com

---

**Vytvořeno:** 2025-11-08
**Verze:** 1.0
**Autor:** Claude Code Security Audit
