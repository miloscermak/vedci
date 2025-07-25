# Newsletter Setup - Vědci zjistili

## 🚀 Kompletní průvodce nastavením newsletteru

### 1. Databáze - Supabase
```sql
-- Spusťte v Supabase SQL editoru:
-- Soubor: newsletter-setup.sql
```

### 2. Email služba - Resend.com

#### Krok 1: Registrace
1. Jděte na https://resend.com
2. Zaregistrujte se
3. Ověřte email

#### Krok 2: API klíč
1. V dashboard jděte na "API Keys"
2. Klikněte "Create API Key"
3. Pojmenujte jej (např. "Vědci zjistili Newsletter")
4. Zkopírujte API klíč

#### Krok 3: Konfigurace domény (volitelné)
- **Pro testování**: Použijte `onboarding@resend.dev`
- **Pro produkci**: Přidejte a ověřte svou doménu

### 3. Konfigurace webu

#### Upravte config.js:
```javascript
const RESEND_CONFIG = {
    apiKey: 'VLOŽTE_VÁŠ_API_KLÍČ_ZDE',
    fromEmail: 'newsletter@vase-domena.cz', // nebo onboarding@resend.dev pro test
    fromName: 'Vědci zjistili'
};
```

### 4. Testování

1. **Přihlašte se do admin**: `milos` / `vedci2025!`
2. **Přihlaste se k newsletteru** na hlavní stránce
3. **V admin sekci Newsletter**:
   - Zkontrolujte statistiky
   - Vyberte článek
   - Zobrazení náhled emailu
   - Otestujte odeslání

## ✅ Hotové funkce

### Frontend
- ✅ Newsletter formulář na hlavní stránce
- ✅ Email validace a error handling
- ✅ Unsubscribe stránka (`unsubscribe.html`)

### Admin rozhraní
- ✅ Newsletter statistiky (odběratelé, odeslané emaily)
- ✅ Výběr článku pro odeslání
- ✅ Live náhled emailu před odesláním
- ✅ Progress indicator při odesílání
- ✅ Seznam všech odběratelů
- ✅ Batch processing (po 10 emailech)

### Email systém
- ✅ Profesionální HTML template
- ✅ Responzivní design pro mobily
- ✅ Automatické unsubscribe linky
- ✅ Rate limiting (1s pauza mezi batchi)
- ✅ Error handling a retry logika

### Databáze
- ✅ `newsletter_subscribers` tabulka
- ✅ `newsletter_emails` pro tracking
- ✅ Unique tokeny pro odhlášení
- ✅ Indexy pro performance

## 🔧 Pokročilá nastavení

### Rate limiting
- Aktuálně: 10 emailů/batch, 1s pauza
- Úprava v `resend-email.js`:
```javascript
const batchSize = 5; // Menší batche
await new Promise(resolve => setTimeout(resolve, 2000)); // Delší pauza
```

### Custom from email
- Ověřte doménu v Resend dashboard
- Aktualizujte `fromEmail` v config.js

### Webhooks (budoucí rozšíření)
- Resend webhooks pro bounce/spam reporting
- Automatické odhlašování neplatných emailů

## 🚨 Bezpečnost

- ✅ API klíč pouze na backend (ne v public JS)
- ✅ Email validace
- ✅ Rate limiting
- ✅ Unique unsubscribe tokeny
- ✅ GDPR compliant unsubscribe

## 📊 Monitoring

### V admin rozhraní vidíte:
- Počet aktivních odběratelů
- Celkem odeslaných emailů
- Celkový počet doručení
- Seznam všech odběratelů

### Resend dashboard:
- Delivery rates
- Bounce rates
- Click tracking
- Email logs

## 🎯 Bezplatný plán Resend
- 3,000 emailů/měsíc
- 100 emailů/den
- Plně postačuje pro začátek

## 🔍 Troubleshooting

### "Email služba není nakonfigurována"
- Zkontrolujte API klíč v config.js
- Obnovte admin stránku

### "Resend API error"
- Zkontrolujte API klíč
- Ověřte from email adresu
- Zkontrolujte rate limits

### Emaily nedorazily
- Zkontrolujte spam složku
- Ověřte email adresy
- Zkontrolujte Resend logs

## 📝 TODO pro produkci
- [ ] Nastavit vlastní doménu v Resend
- [ ] Implementovat webhooks pro bounces
- [ ] Přidat A/B testing subject řádků
- [ ] Segmentace odběratelů
- [ ] Click tracking analytics