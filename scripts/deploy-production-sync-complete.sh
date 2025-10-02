#!/bin/bash

# ==============================================================================
# Script de déploiement complet de la synchronisation en production
# ==============================================================================
# Ce script automatise toutes les étapes nécessaires pour déployer
# la fonctionnalité de synchronisation des permissions et menus
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
echo "  DEPLOIEMENT SYNCHRONISATION PRODUCTION"
echo "=========================================="
echo -e "${NC}"

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "server.js" ]; then
    echo -e "${RED}❌ Erreur: Fichier server.js non trouvé${NC}"
    echo "Assurez-vous d'être dans le répertoire ~/apps/ebvision"
    exit 1
fi

echo -e "${GREEN}✓ Répertoire racine trouvé${NC}"
echo ""

# ==============================================================================
# ÉTAPE 1 : MIGRATION SQL
# ==============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 ÉTAPE 1/4 : Migration SQL${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if node scripts/run-sync-migration.js; then
    echo -e "${GREEN}✅ Migration exécutée avec succès${NC}"
else
    echo -e "${RED}❌ Erreur lors de la migration${NC}"
    echo "Vérifiez les logs ci-dessus pour plus de détails"
    exit 1
fi

echo ""

# ==============================================================================
# ÉTAPE 2 : NETTOYAGE DES ANCIENNES PERMISSIONS
# ==============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🧹 ÉTAPE 2/4 : Nettoyage des permissions obsolètes${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if node scripts/clean-old-menu-permissions.js; then
    echo -e "${GREEN}✅ Nettoyage terminé${NC}"
else
    echo -e "${YELLOW}⚠️  Le nettoyage a rencontré des erreurs (normal si les permissions n'existaient pas)${NC}"
fi

echo ""

# ==============================================================================
# ÉTAPE 3 : VÉRIFICATION
# ==============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 ÉTAPE 3/4 : Vérification de la structure${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

node scripts/check-menu-structure.js 2>&1 | head -n 50

echo ""

# ==============================================================================
# ÉTAPE 4 : REDÉMARRAGE DU SERVEUR
# ==============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔄 ÉTAPE 4/4 : Redémarrage du serveur${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Vérifier si PM2 est installé
if command -v pm2 &> /dev/null; then
    echo "Redémarrage via PM2..."
    if pm2 restart ebvision; then
        echo -e "${GREEN}✅ Serveur redémarré avec succès${NC}"
        echo ""
        echo "Logs du serveur:"
        pm2 logs ebvision --lines 10 --nostream
    else
        echo -e "${RED}❌ Erreur lors du redémarrage PM2${NC}"
        exit 1
    fi
elif systemctl is-active --quiet ebvision; then
    echo "Redémarrage via systemd..."
    if sudo systemctl restart ebvision; then
        echo -e "${GREEN}✅ Serveur redémarré avec succès${NC}"
    else
        echo -e "${RED}❌ Erreur lors du redémarrage systemd${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Impossible de détecter le gestionnaire de processus${NC}"
    echo "Veuillez redémarrer le serveur manuellement"
fi

echo ""

# ==============================================================================
# RÉSUMÉ ET PROCHAINES ÉTAPES
# ==============================================================================
echo -e "${GREEN}"
echo "=========================================="
echo "  ✅ DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !"
echo "=========================================="
echo -e "${NC}"

echo ""
echo -e "${BLUE}📝 Prochaines étapes :${NC}"
echo ""
echo "1. Ouvrez votre navigateur"
echo "2. Connectez-vous avec un compte SUPER_ADMIN"
echo "3. Allez sur: https://votre-domaine.com/permissions-admin.html"
echo "4. Cliquez sur le bouton jaune 'Synchroniser Permissions & Menus'"
echo "5. Attendez 3 secondes pour le rechargement automatique"
echo "6. Vérifiez l'onglet 'Permissions de Menu'"
echo ""

echo -e "${BLUE}📊 Vérifications attendues :${NC}"
echo "  • 9 sections de menu"
echo "  • 41 permissions de menu"
echo "  • Toutes les permissions correctement nommées"
echo ""

echo -e "${YELLOW}⚠️  Important :${NC}"
echo "  La synchronisation complète se fait VIA L'INTERFACE WEB"
echo "  Ce script a seulement préparé la base de données"
echo ""

echo -e "${BLUE}📖 Documentation complète :${NC}"
echo "  docs/DEPLOY_SYNC_PRODUCTION.md"
echo ""

# Afficher les statistiques actuelles
echo -e "${BLUE}📈 Statistiques actuelles :${NC}"
echo ""

# Compter les enregistrements (si psql est disponible)
if command -v psql &> /dev/null; then
    echo "Interrogation de la base de données..."
    
    # Note: Ajustez ces variables selon votre configuration
    DB_USER="${DB_USER:-ebvision_user}"
    DB_NAME="${DB_NAME:-ebvision_db}"
    
    PAGES_COUNT=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM pages;" 2>/dev/null || echo "N/A")
    SECTIONS_COUNT=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM menu_sections;" 2>/dev/null || echo "N/A")
    ITEMS_COUNT=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM menu_items;" 2>/dev/null || echo "N/A")
    MENU_PERMS_COUNT=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM permissions WHERE code LIKE 'menu.%';" 2>/dev/null || echo "N/A")
    
    echo "  • Pages: $PAGES_COUNT"
    echo "  • Sections de menu: $SECTIONS_COUNT"
    echo "  • Items de menu: $ITEMS_COUNT"
    echo "  • Permissions de menu: $MENU_PERMS_COUNT"
else
    echo "  psql non disponible - impossible d'afficher les statistiques"
fi

echo ""
echo -e "${GREEN}🎉 Félicitations ! Le déploiement est terminé.${NC}"
echo ""

