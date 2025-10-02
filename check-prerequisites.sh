#!/bin/bash

echo "🔍 Vérification des prérequis pour EB-Vision 2.0..."
echo ""

# Vérifier Node.js
echo "📦 Vérification de Node.js..."
if command -v node &> /dev/null; then
    echo "✅ Node.js installé: $(node --version)"
else
    echo "❌ Node.js non installé"
    echo "   💡 Exécutez: ./install-nodejs-nvm.sh"
    exit 1
fi

# Vérifier npm
echo "📦 Vérification de npm..."
if command -v npm &> /dev/null; then
    echo "✅ npm installé: $(npm --version)"
else
    echo "❌ npm non installé"
    echo "   💡 Exécutez: ./install-nodejs-nvm.sh"
    exit 1
fi

# Vérifier les fichiers essentiels
echo ""
echo "📁 Vérification des fichiers essentiels..."

required_files=(
    "package.json"
    "server.js"
    "config.production.js"
    "install.sh"
    "scripts/migrate-production.js"
    "scripts/deploy-planethoster.js"
)

missing_files=()

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file manquant"
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    echo ""
    echo "❌ Fichiers manquants détectés. Veuillez les télécharger."
    exit 1
fi

# Vérifier les dossiers essentiels
echo ""
echo "📁 Vérification des dossiers essentiels..."

required_dirs=(
    "src"
    "public"
    "scripts"
)

missing_dirs=()

for dir in "${required_dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir/"
    else
        echo "❌ $dir/ manquant"
        missing_dirs+=("$dir")
    fi
done

if [ ${#missing_dirs[@]} -gt 0 ]; then
    echo ""
    echo "❌ Dossiers manquants détectés. Veuillez les télécharger."
    exit 1
fi

# Vérifier la configuration
echo ""
echo "⚙️ Vérification de la configuration..."

if [ -f "config.production.js" ]; then
    echo "✅ config.production.js présent"
    echo "   💡 N'oubliez pas de le configurer avec vos informations de base de données"
else
    echo "❌ config.production.js manquant"
    exit 1
fi

echo ""
echo "🎉 Tous les prérequis sont satisfaits !"
echo ""
echo "📋 Prochaines étapes :"
echo "   1. Configurez config.production.js avec vos informations de base de données"
echo "   2. Exécutez: ./install.sh"
echo ""
echo "🚀 Votre application EB-Vision 2.0 est prête à être installée !"









