#!/bin/bash

# ==============================================================================
# Script de déploiement de la correction des permissions de menu
# ==============================================================================

set -e  # Arrêter en cas d'erreur

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "=========================================="
echo "  DEPLOIEMENT CORRECTION PERMISSIONS MENU"
echo "=========================================="
echo -e "${NC}"

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "server.js" ]; then
    echo -e "${RED}❌ Erreur: Fichier server.js non trouvé${NC}"
    echo "Assurez-vous d'être dans le répertoire de l'application"
    exit 1
fi

echo -e "${GREEN}✓ Répertoire racine trouvé${NC}"
echo ""

# ==============================================================================
# ÉTAPE 1 : MISE À JOUR DU CODE
# ==============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 ÉTAPE 1/3 : Mise à jour du code${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "${BLUE}🔄 Récupération des dernières modifications...${NC}"
if git pull origin main; then
    echo -e "${GREEN}✅ Code mis à jour avec succès${NC}"
else
    echo -e "${RED}❌ Erreur lors de la mise à jour du code${NC}"
    exit 1
fi

echo ""

# ==============================================================================
# ÉTAPE 2 : VÉRIFICATION DES FICHIERS
# ==============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 ÉTAPE 2/3 : Vérification des fichiers${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Vérifier les fichiers modifiés
files_to_check=(
    "public/js/menu-permissions.js"
    "docs/FIX_MENU_PERMISSIONS_SUBMENUS.md"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file - MANQUANT !${NC}"
        exit 1
    fi
done

echo ""

# ==============================================================================
# ÉTAPE 3 : REDÉMARRAGE DU SERVEUR
# ==============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 ÉTAPE 3/3 : Redémarrage du serveur${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "${BLUE}🔄 Redémarrage du serveur...${NC}"
if [ -f "restart-server.sh" ]; then
    ./restart-server.sh
elif command -v pm2 &> /dev/null; then
    echo -e "${BLUE}🔄 Redémarrage via PM2...${NC}"
    pm2 restart eb-vision-2-0
    pm2 status
else
    echo -e "${YELLOW}⚠️ Script de redémarrage non trouvé, redémarrage manuel requis${NC}"
fi

echo ""

# ==============================================================================
# RÉSUMÉ
# ==============================================================================
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}✅ DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo -e "${BLUE}📋 Prochaines étapes :${NC}"
echo "1. 🌐 Tester l'application sur https://votre-domaine.com"
echo "2. 🔐 Se connecter avec un compte utilisateur"
echo "3. 📋 Aller sur /permissions-admin.html"
echo "4. 🧪 Tester les permissions de menu"
echo "5. ✅ Vérifier que les sous-menus s'affichent/masquent correctement"
echo ""
echo -e "${YELLOW}📊 Vérification des logs :${NC}"
echo "tail -f logs/server.log"
echo ""
echo -e "${GREEN}🎉 La correction des permissions de menu est maintenant active !${NC}"

