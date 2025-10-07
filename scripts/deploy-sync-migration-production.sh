#!/bin/bash

# Script de déploiement de la migration de synchronisation en production
# Ce script crée les tables nécessaires pour la synchronisation des permissions et menus

echo "=========================================="
echo "Migration Synchronisation - Production"
echo "=========================================="
echo ""

# Couleurs pour les logs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Étape 1 : Vérifier que nous sommes dans le bon répertoire
if [ ! -f "server.js" ]; then
    echo -e "${RED}❌ Erreur: Fichier server.js non trouvé${NC}"
    echo "Assurez-vous d'être dans le répertoire racine de l'application"
    exit 1
fi

echo -e "${GREEN}✓ Répertoire racine trouvé${NC}"

# Étape 2 : Exécuter la migration via Node.js
echo ""
echo "📋 Exécution de la migration 005_create_sync_tables.sql..."
node scripts/run-sync-migration.js

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migration exécutée avec succès${NC}"
else
    echo -e "${RED}❌ Erreur lors de l'exécution de la migration${NC}"
    exit 1
fi

# Étape 3 : Nettoyer les anciennes permissions obsolètes
echo ""
echo "🧹 Nettoyage des anciennes permissions obsolètes..."
node scripts/clean-old-menu-permissions.js

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Nettoyage terminé${NC}"
else
    echo -e "${YELLOW}⚠️  Le nettoyage a rencontré des erreurs (certaines permissions n'existaient peut-être pas)${NC}"
fi

# Étape 4 : Vérifier la structure des menus
echo ""
echo "🔍 Vérification de la structure des menus..."
node scripts/check-menu-structure.js

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Déploiement terminé !${NC}"
echo "=========================================="
echo ""
echo "Prochaines étapes:"
echo "1. Redémarrer le serveur: pm2 restart ebvision"
echo "2. Connectez-vous avec un compte SUPER_ADMIN"
echo "3. Allez sur /permissions-admin.html"
echo "4. Cliquez sur 'Synchroniser Permissions & Menus'"
echo ""





