#!/bin/bash

# Script pour déployer le script de redémarrage sur le serveur
# Usage: ./deploy-restart-script.sh

echo "🚀 Déploiement du script de redémarrage sur le serveur..."

# Créer le dossier production-scripts s'il n'existe pas
mkdir -p production-scripts

# Copier le script fixé vers production-scripts
cp scripts/restart-server-fixed.sh production-scripts/restart-server.sh

# Rendre le script exécutable
chmod +x production-scripts/restart-server.sh

echo "✅ Script de redémarrage déployé dans production-scripts/"
echo "📁 Le dossier production-scripts/ est ignoré par Git"
echo "🔧 Utilisez: ./production-scripts/restart-server.sh pour redémarrer le serveur"

# Créer un alias pour faciliter l'utilisation
echo ""
echo "💡 Pour faciliter l'utilisation, vous pouvez créer un alias:"
echo "   alias restart-ebvision='./production-scripts/restart-server.sh'"
echo "   Ajoutez cette ligne à votre ~/.bashrc ou ~/.profile"
