# 🔄 Fallback instrukce - 19.8.2025

## Zálohy vytvořené dnes:

- `index_backup.html` - původní homepage
- `styles_backup.css` - původní styly
- `restore_original.sh` - skript pro rychlou obnovu

## Jak se vrátit k původnímu designu:

### Možnost 1: Použít skript (nejrychlejší)
```bash
./restore_original.sh
```

### Možnost 2: Manuálně (2 příkazy)
```bash
cp index_backup.html index.html
cp styles_backup.css styles.css
```

### Možnost 3: Z Gitu
```bash
git checkout 80f73c1 -- index.html styles.css
```

## Po obnovení:
- Vyčistit cache prohlížeče (Ctrl+F5 nebo Cmd+Shift+R)
- Zkontrolovat, že vše funguje správně

## Poznámky:
- Zálohy vytvořeny: 19.8.2025 v 9:00
- Commit před redesignem: `80f73c1`
- Nový design bude v souborech: `styles-modern.css`, `homepage-modern.js`