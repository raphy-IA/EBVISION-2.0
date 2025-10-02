#!/bin/bash

echo "🚀 Installation de Node.js via NVM (sans sudo)..."

# Vérifier si Node.js est déjà installé
if command -v node &> /dev/null; then
    echo "✅ Node.js est déjà installé: $(node --version)"
    if command -v npm &> /dev/null; then
        echo "✅ npm est déjà installé: $(npm --version)"
        exit 0
    fi
fi

# Installer NVM (Node Version Manager)
echo "📦 Installation de NVM..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Charger NVM dans le shell actuel
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Installer Node.js 18 LTS
echo "📦 Installation de Node.js 18 LTS..."
nvm install 18
nvm use 18
nvm alias default 18

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

echo "🎉 Node.js et npm sont maintenant installés via NVM !"
echo "📋 Vous pouvez maintenant exécuter: ./install.sh"

# Ajouter NVM au .bashrc pour les sessions futures
echo "📝 Configuration de NVM pour les sessions futures..."
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc
echo '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' >> ~/.bashrc










