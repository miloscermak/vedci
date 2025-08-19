#!/bin/bash

echo "🔄 Obnovuji původní design..."

cp index_backup.html index.html
cp styles_backup.css styles.css

echo "✅ Hotovo! Původní design byl obnoven."
echo "🌐 Nezapomeň vyčistit cache prohlížeče (Ctrl+F5)"