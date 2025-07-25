# Changelog - 25. července 2025

## 🚀 Přechod na Netlify a dokončení newsletter systému

### 🔧 Hlavní změny

**1. Přechod z GitHub Pages na Netlify**
- Nasazení webu na Netlify pro podporu serverless funkcí
- Připojení domény `vedcizjistili.cz` k Netlify
- Konfigurace `netlify.toml` pro automatické buildy

**2. Implementace Netlify Functions**
- `netlify/functions/send-email.js` - pro ověřovací emaily
- `netlify/functions/send-newsletter.js` - pro hromadné rozesílání
- Přímé volání Resend API ze serverless funkcí
- Řešení CORS problémů pomocí serverless architektury

**3. Bezpečnostní opravy (KRITICKÉ)**
- **2x exponovaný Resend API klíč** v GitHubu - okamžitě odstraněn
- Přesun API klíčů do Netlify environment variables (`RESEND_API_KEY`)
- Eliminace všech hardcoded secrets z kódu
- Serverside handling API klíčů místo frontend exposure

**4. Newsletter toggle funkcionalita**
- Přidán toggle switch v admin rozhraní pro zapnutí/vypnutí newsletter sekce
- Uložení stavu do localStorage
- CSS třída `.newsletter-signup.hidden` pro skrývání
- Real-time aktualizace viditelnosti na hlavní stránce

### 📧 Email systém - plně automatický

**Ověřovací emaily:**
- Automatické odesílání při registraci
- Double opt-in systém s verification tokeny
- Responzivní email templates

**Newsletter rozesílání:**
- Admin rozhraní pro výběr článků
- Hromadné odesílání s progress indikátory
- Postupné odesílání s pauzami (100ms mezi emaily)
- Unsubscribe linky v každém emailu

### 🛠 Technické vylepšení

**Frontend úpravy:**
- Odebrány reference na `config.local.js` pro online nasazení
- Fallback konfigurace pro production environment
- Vylepšené error handling pro Netlify Functions
- Debug logy pro troubleshooting

**Backend Functions:**
- Node.js 18 kompatibilita
- Fetch API fallback pro různé Node.js verze
- CORS headers pro cross-origin requests
- Comprehensive error handling s detailními zprávami

**Admin rozhraní:**
- Odstranění falešných varování o nekonfigurované email službě
- Zelený status indikátor "Email služba je nakonfigurována (Netlify Functions)"
- Zachování všech funkcionalit (přidávání/mazání odběratelů, statistiky)

### 🗂 Soubory a konfigurace

**Nové soubory:**
```
netlify.toml                     # Netlify konfigurace
netlify/functions/send-email.js  # Ověřovací emaily
netlify/functions/send-newsletter.js # Newsletter rozesílání
netlify/functions/test.js        # Debug funkce
```

**Upravené soubory:**
- `index.html` - newsletter toggle, Netlify Functions volání
- `admin.html` - toggle UI, odstranění varování
- `styles.css` - toggle switch styling
- `resend-email.js` - přepis na Netlify Functions
- `package.json` - node-fetch dependency
- `.gitignore` - config.local.js protection

### 🎯 Výsledek

✅ **Plně funkční newsletter systém** s automatickým odesíláním
✅ **Bezpečné API klíče** v environment variables  
✅ **Produkční nasazení** na vlastní doméně vedcizjistili.cz
✅ **Serverless architektura** bez nutnosti vlastního serveru
✅ **Admin rozhraní** pro kompletní správu newsletteru
✅ **Toggle funkcionalita** pro zapnutí/vypnutí newsletter sekce
✅ **GDPR compliant** double opt-in systém

### 🚨 Bezpečnostní incidenty (vyřešeno)

**Incident #1:** API klíč `re_C38cinM2_CwwKaM8tdhMEpZUn7BKBknKc` exponován v `config.js`
- **Řešení:** API klíč zrušen, přesunut do `config.local.js`, přidán do .gitignore

**Incident #2:** API klíč `re_Mpd284vf_J7y8UgG5tNYyNRnbtdrLutuH` exponován v HTML fallback kódu  
- **Řešení:** API klíč zrušen, přesunut do Netlify environment variables

**Současný stav:** 🔒 Všechny API klíče jsou bezpečné v environment variables

---

**Celkový výsledek:** Kompletní, bezpečný a plně automatický newsletter systém připravený pro produkční provoz! 🎉