# Vědci zjistili - Newsletter Web

Informační web s kompletním newsletter systémem pro sdílení vědeckých objevů.

## 🚀 Funkce

- **Newsletter systém** s double opt-in ověřením
- **Admin rozhraní** pro správu článků a odběratelů  
- **Rich text editor** pro vytváření článků
- **Email templates** s responzivním designem
- **Statistiky a reporting**
- **Unsubscribe systém**

## 📋 Požadavky

- Node.js 16+
- Supabase účet
- Resend.com účet (pro emaily)

## ⚡ Rychlé spuštění

### 1. Klonování a instalace
```bash
git clone <repository-url>
cd vedci
npm install
```

### 2. Konfigurace databáze (Supabase)

1. Vytvoř projekt na [supabase.com](https://supabase.com)
2. Spusť SQL skripty v tomto pořadí:
   ```sql
   -- database-setup.sql
   -- database-update.sql  
   -- newsletter-setup.sql
   -- newsletter-verification-update.sql
   ```

### 3. Konfigurace emailů (Resend)

1. Vytvoř účet na [resend.com](https://resend.com)
2. Ověř svou doménu v Resend dashboard
3. Získej API klíč

### 4. Konfigurace aplikace

Aktualizuj `config.js`:

```javascript
const SUPABASE_CONFIG = {
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key'
};

const RESEND_CONFIG = {
    apiKey: 'your-resend-api-key',
    fromEmail: 'newsletter@your-domain.com',
    fromName: 'Vědci zjistili'
};
```

### 5. Spuštění serveru

```bash
npm start
```

Web běží na `http://localhost:8000`

## 🎯 Použití

### Administrace
- Přejdi na `/admin.html`
- Přihlášení: `milos` / `vedci2025!`
- Publikuj články, spravuj odběratele, odesílej newsletter

### Newsletter
- Uživatelé se registrují na hlavní stránce
- Dostanou ověřovací email
- Po kliknutí na odkaz začnou dostávat newsletter
- Mohou se odhlásit pomocí unsubscribe linku

## 📁 Struktura souborů

```
vedci/
├── index.html              # Hlavní stránka
├── admin.html              # Admin rozhraní
├── archiv.html             # Archiv článků
├── about.html              # O projektu
├── verify-email.html       # Ověření emailu
├── unsubscribe.html        # Odhlášení z newsletteru
├── styles.css              # Styly
├── config.js               # Konfigurace
├── database.js             # Databázové funkce
├── newsletter-generator.js  # Email templates
├── resend-email.js         # Email služba
├── server.js               # Node.js server
└── templates/
    ├── newsletter-template.html
    └── verification-email-template.html
```

## 🔧 Pokročilá konfigurace

### Produkční nasazení

1. **Nahraj na web hosting** (Netlify, Vercel, vlastní server)
2. **Aktualizuj URLs** v config.js na produkční domény
3. **Nastavit SSL** certifikát
4. **Ověř doménu** v Resend pro lepší deliverability

### Customizace

- **Email templates**: Upravit soubory v `templates/`
- **Styly**: Upravit `styles.css`
- **Přihlášení admin**: Změnit v `admin.html` (řádek ~225)

## 📊 Databázové tabulky

- `articles` - Články s obsahem a metadaty
- `pages` - Statické stránky (O projektu)
- `newsletter_subscribers` - Odběratelé s ověřovacími tokeny
- `newsletter_emails` - Log odeslaných emailů

## 🛠 Technologie

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js, Express
- **Databáze**: Supabase (PostgreSQL)
- **Emaily**: Resend.com
- **Editor**: Quill.js
- **Analytics**: Google Analytics 4

## 📝 License

MIT License

## 🤝 Přispívání

Pull requesty vítány! Pro větší změny prosím nejdříve otevřete issue.

## 📞 Podpora

Pro otázky kontaktujte: [váš-email]