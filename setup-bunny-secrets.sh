#!/bin/bash

echo "=== Configuration des secrets GitHub pour BunnyCDN ==="
echo ""

# Vérifier que GitHub CLI est installé
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) n'est pas installé!"
    echo ""
    echo "Pour installer GitHub CLI :"
    echo "  - macOS: brew install gh"
    echo "  - Ubuntu/Debian: sudo apt install gh"
    echo "  - Windows: winget install --id GitHub.cli"
    echo ""
    echo "Plus d'infos: https://cli.github.com/"
    exit 1
fi

# Vérifier l'authentification GitHub
if ! gh auth status &> /dev/null; then
    echo "❌ Vous n'êtes pas authentifié avec GitHub CLI!"
    echo ""
    echo "Exécutez: gh auth login"
    echo ""
    exit 1
fi

echo "✓ GitHub CLI détecté et authentifié"
echo ""
echo "Ce script va vous aider à configurer les secrets nécessaires pour le déploiement automatique."
echo ""
echo "Vous aurez besoin des informations suivantes depuis votre compte BunnyCDN :"
echo "1. Le nom de votre Storage Zone"
echo "2. Le mot de passe FTP/API de votre Storage Zone"
echo "3. L'endpoint de votre région (ex: storage, ny.storage, la.storage)"
echo "4. Votre clé API BunnyCDN"
echo "5. L'ID de votre Pull Zone"
echo ""
echo "Appuyez sur Entrée pour continuer..."
read

# Storage Zone
echo ""
echo "1. BUNNY_STORAGE_ZONE"
echo "Entrez le nom de votre Storage Zone BunnyCDN :"
read -p "> " STORAGE_ZONE
if [ -n "$STORAGE_ZONE" ]; then
    gh secret set BUNNY_STORAGE_ZONE --body "$STORAGE_ZONE"
    echo "✓ BUNNY_STORAGE_ZONE configuré"
fi

# Storage Password
echo ""
echo "2. BUNNY_STORAGE_PASSWORD"
echo "Entrez le mot de passe FTP/API de votre Storage Zone :"
echo "(Le mot de passe ne sera pas affiché pour des raisons de sécurité)"
read -s -p "> " STORAGE_PASSWORD
echo ""
if [ -n "$STORAGE_PASSWORD" ]; then
    gh secret set BUNNY_STORAGE_PASSWORD --body "$STORAGE_PASSWORD"
    echo "✓ BUNNY_STORAGE_PASSWORD configuré"
fi

# Storage Endpoint
echo ""
echo "3. BUNNY_STORAGE_ENDPOINT"
echo "Sélectionnez votre région :"
echo "  1) Europe (Falkenstein) - storage"
echo "  2) New York - ny.storage"
echo "  3) Los Angeles - la.storage"
echo "  4) Singapore - sg.storage"
echo "  5) Sydney - syd.storage"
read -p "Votre choix (1-5) : " REGION_CHOICE

case $REGION_CHOICE in
    1) ENDPOINT="storage" ;;
    2) ENDPOINT="ny.storage" ;;
    3) ENDPOINT="la.storage" ;;
    4) ENDPOINT="sg.storage" ;;
    5) ENDPOINT="syd.storage" ;;
    *) ENDPOINT="storage" ;;
esac

gh secret set BUNNY_STORAGE_ENDPOINT --body "$ENDPOINT"
echo "✓ BUNNY_STORAGE_ENDPOINT configuré : $ENDPOINT"

# API Key
echo ""
echo "4. BUNNY_API_KEY"
echo "Entrez votre clé API BunnyCDN principale :"
echo "(Trouvable dans Account Settings → API → API Key)"
read -s -p "> " API_KEY
echo ""
if [ -n "$API_KEY" ]; then
    gh secret set BUNNY_API_KEY --body "$API_KEY"
    echo "✓ BUNNY_API_KEY configuré"
fi

# Pull Zone ID
echo ""
echo "5. BUNNY_PULL_ZONE_ID"
echo "Entrez l'ID de votre Pull Zone :"
echo "(Trouvable dans CDN → Votre Pull Zone → URL ou détails)"
read -p "> " PULL_ZONE_ID
if [ -n "$PULL_ZONE_ID" ]; then
    gh secret set BUNNY_PULL_ZONE_ID --body "$PULL_ZONE_ID"
    echo "✓ BUNNY_PULL_ZONE_ID configuré"
fi

echo ""
echo "=== Configuration terminée ! ==="
echo ""
echo "Secrets configurés :"
gh secret list
echo ""
echo "Vous pouvez maintenant :"
echo "1. Faire un push pour déclencher le déploiement automatique"
echo "2. Ou déclencher manuellement : gh workflow run deploy-bunnycdn.yml"
echo ""