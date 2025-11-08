#!/bin/bash
# Automatické mergování a push do main branché

set -e  # Exit on error

CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Aktuální branch: $CURRENT_BRANCH"

# Uložení změn pokud existují
if [[ -n $(git status -s) ]]; then
    echo "⚠️  Máte neuložené změny. Prosím commitněte je nejdřív."
    exit 1
fi

# Přepnutí na main
echo "🔀 Přepínám na main..."
git checkout main

# Pull latest
echo "⬇️  Stahuji nejnovější main..."
git pull origin main --rebase

# Merge claude branch
echo "🔀 Merguji $CURRENT_BRANCH do main..."
git merge "$CURRENT_BRANCH" --no-edit

# Push to main
echo "⬆️  Pushuji do main..."
git push origin main

# Zpět na původní branch
echo "↩️  Vracím se na $CURRENT_BRANCH..."
git checkout "$CURRENT_BRANCH"

echo "✅ Hotovo! Main je aktualizovaný a Netlify začne deployovat."
