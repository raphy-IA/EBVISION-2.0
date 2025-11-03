#!/bin/bash

echo "🚀 Déploiement de la synchronisation des permissions"
echo "======================================================="
echo ""

# 1. Mettre à jour la sidebar avec les permissions normalisées
echo "📋 Étape 1: Mise à jour de la sidebar..."
node scripts/update-sidebar-permissions.js
if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la mise à jour de la sidebar"
    exit 1
fi
echo ""

# 2. Synchroniser les permissions en base de données
echo "📋 Étape 2: Synchronisation des permissions en base..."
node scripts/sync-permissions-complete.js
if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la synchronisation des permissions"
    exit 1
fi
echo ""

# 3. Afficher les instructions pour la production
echo "======================================================="
echo "✅ Synchronisation locale terminée avec succès!"
echo "======================================================="
echo ""
echo "📦 Pour déployer en production, exécutez:"
echo ""
echo "   1. Committer et pousser les changements:"
echo "      git add ."
echo "      git commit -m 'feat: Synchronisation complete des permissions'"
echo "      git push origin main"
echo ""
echo "   2. Sur le serveur de production:"
echo "      cd ~/apps/ebvision"
echo "      git pull origin main"
echo "      node scripts/sync-permissions-complete.js"
echo "      ./restart-server.sh"
echo ""



