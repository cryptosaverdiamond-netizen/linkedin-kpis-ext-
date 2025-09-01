#!/bin/bash

# Script d'installation pour l'extension LinkedIn
echo "🚀 Installation de l'extension LinkedIn Data Scraper"
echo "=================================================="

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "manifest.json" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis le répertoire de l'extension"
    exit 1
fi

# Vérifier que core/config.js existe
if [ ! -f "core/config.js" ]; then
    echo "❌ Erreur: core/config.js n'existe pas"
    exit 1
fi

echo ""
echo "📋 Configuration requise:"
echo "1. URL de votre Google Apps Script (WEBAPP_URL)"
echo "2. Clé secrète pour l'authentification (SECRET)"
echo "3. ID de votre entreprise (COMPANY_ID)"
echo "4. ID de votre équipe (TEAM_ID)"
echo ""

# Demander la configuration
read -p "🌐 WEBAPP_URL (ex: https://script.google.com/macros/s/SCRIPT_ID/exec): " webapp_url
read -p "🔑 SECRET (clé d'authentification): " secret
read -p "🏢 COMPANY_ID (ex: acme-corp): " company_id
read -p "👥 TEAM_ID (ex: marketing-team): " team_id

# Validation basique
if [ -z "$webapp_url" ] || [ -z "$secret" ] || [ -z "$company_id" ] || [ -z "$team_id" ]; then
    echo "❌ Erreur: Tous les champs sont obligatoires"
    exit 1
fi

echo ""
echo "⚙️  Mise à jour de la configuration..."

# Mettre à jour core/config.js
sed -i.bak "s|WEBAPP_URL: \".*\"|WEBAPP_URL: \"$webapp_url\"|g" core/config.js
sed -i.bak "s|SECRET: \".*\"|SECRET: \"$secret\"|g" core/config.js
sed -i.bak "s|COMPANY_ID: \".*\"|COMPANY_ID: \"$company_id\"|g" core/config.js
sed -i.bak "s|TEAM_ID: \".*\"|TEAM_ID: \"$team_id\"|g" core/config.js

# Supprimer le fichier de backup
rm core/config.js.bak

echo "✅ Configuration mise à jour avec succès!"
echo ""

echo "📱 Installation dans Chrome:"
echo "1. Ouvrir Chrome et aller dans chrome://extensions/"
echo "2. Activer le 'Mode développeur' (en haut à droite)"
echo "3. Cliquer 'Charger l'extension non empaquetée'"
echo "4. Sélectionner ce répertoire: $(pwd)"
echo ""

echo "🧪 Test de l'extension:"
echo "1. Aller sur LinkedIn (https://www.linkedin.com/dashboard/)"
echo "2. Ouvrir la console développeur (F12)"
echo "3. Vérifier les logs '[Dashboard]' ou '[Posts]'"
echo ""

echo "📚 Documentation:"
echo "- README.md : Guide complet d'utilisation"
echo "- config.example.js : Exemple de configuration"
echo "- Logs console : Debug et traçabilité"
echo ""

echo "🎯 Pages supportées:"
echo "- Dashboard: https://www.linkedin.com/dashboard/"
echo "- Posts: https://www.linkedin.com/in/<slug>/recent-activity/all/"
echo ""

echo "✨ Installation terminée! L'extension est prête à être chargée dans Chrome."