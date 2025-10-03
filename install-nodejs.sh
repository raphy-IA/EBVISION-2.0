#!/bin/bash

echo "🚀 Installation de Node.js et npm sur PlanetHoster..."

# Vérifier si Node.js est déjà installé
if command -v node &> /dev/null; then
    echo "✅ Node.js est déjà installé: $(node --version)"
    if command -v npm &> /dev/null; then
        echo "✅ npm est déjà installé: $(npm --version)"
        exit 0
    fi
fi

echo "📦 Installation de Node.js via NodeSource..."

# Ajouter le repository NodeSource pour Node.js 18 LTS
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -

# Installer Node.js et npm
sudo yum install -y nodejs

# Vérifier l'installation
if command -v node &> /dev/null; then
    echo "✅ Node.js installé avec succès: $(node --version)"
else
    echo "❌ Échec de l'installation de Node.js"
    exit 1
fi

if command -v npm &> /dev/null; then
    echo "✅ npm installé avec succès: $(npm --version)"
else
    echo "❌ Échec de l'installation de npm"
    exit 1
fi

echo "🎉 Node.js et npm sont maintenant installés !"
echo "📋 Vous pouvez maintenant exécuter: ./install.sh"











