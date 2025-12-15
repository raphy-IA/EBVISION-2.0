#!/bin/bash

# Script de migration Business Unit pour Production
# Ce script doit être exécuté APRÈS le deploy.sh

set -e  # Arrêter en cas d'erreur

echo "🚀 Début de la migration Business Unit pour les types de mission"
echo "================================================================"
echo ""

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erreur: package.json non trouvé. Êtes-vous dans le bon répertoire?${NC}"
    exit 1
fi

# Vérifier que les scripts existent
if [ ! -f "scripts/migrations/migrate_mission_types_bu.js" ]; then
    echo -e "${RED}❌ Erreur: Script de migration non trouvé${NC}"
    exit 1
fi

if [ ! -f "scripts/migrations/copy_tasks_to_duplicated_types.js" ]; then
    echo -e "${RED}❌ Erreur: Script de copie des tâches non trouvé${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  ATTENTION: Ce script va modifier les données de la base de données${NC}"
echo -e "${YELLOW}   Un backup devrait avoir été créé par deploy.sh${NC}"
echo ""
read -p "Voulez-vous continuer? (oui/non): " confirm

if [ "$confirm" != "oui" ]; then
    echo "❌ Migration annulée"
    exit 0
fi

echo ""
echo "📊 Étape 1/3: Analyse de la situation actuelle (optionnel)"
echo "-----------------------------------------------------------"
read -p "Voulez-vous exécuter l'analyse préalable? (oui/non): " run_analysis

if [ "$run_analysis" = "oui" ]; then
    echo "🔍 Exécution de l'analyse..."
    node scripts/migrations/analyze_mission_types_bu.js
    
    if [ -f "scripts/migrations/analysis_report.json" ]; then
        echo -e "${GREEN}✅ Rapport d'analyse créé: scripts/migrations/analysis_report.json${NC}"
        echo ""
        read -p "Voulez-vous voir le résumé? (oui/non): " show_summary
        if [ "$show_summary" = "oui" ]; then
            cat scripts/migrations/analysis_report.json | head -50
        fi
    fi
    echo ""
    read -p "Continuer avec la migration? (oui/non): " continue_migration
    if [ "$continue_migration" != "oui" ]; then
        echo "❌ Migration annulée"
        exit 0
    fi
fi

echo ""
echo "🔄 Étape 2/3: Migration des types de mission"
echo "-----------------------------------------------------------"
echo "Ce script va:"
echo "  - Assigner les Business Units aux types existants"
echo "  - Dupliquer les types partagés entre plusieurs BU"
echo "  - Mettre à jour les missions existantes"
echo ""

node scripts/migrations/migrate_mission_types_bu.js

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migration des types de mission réussie${NC}"
else
    echo -e "${RED}❌ Erreur lors de la migration des types de mission${NC}"
    echo -e "${RED}   Vérifiez les logs ci-dessus${NC}"
    exit 1
fi

echo ""
echo "📋 Étape 3/3: Copie des tâches vers les types dupliqués"
echo "-----------------------------------------------------------"
echo "Ce script va copier les tâches des types originaux vers leurs duplicatas"
echo ""

node scripts/migrations/copy_tasks_to_duplicated_types.js

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Copie des tâches réussie${NC}"
else
    echo -e "${RED}❌ Erreur lors de la copie des tâches${NC}"
    echo -e "${RED}   Vérifiez les logs ci-dessus${NC}"
    exit 1
fi

echo ""
echo "================================================================"
echo -e "${GREEN}✅ Migration Business Unit terminée avec succès!${NC}"
echo "================================================================"
echo ""
echo "📊 Vérifications recommandées:"
echo "  1. Vérifier la structure: psql ebvision -c '\d mission_types'"
echo "  2. Vérifier les données: psql ebvision -c 'SELECT COUNT(*) FROM mission_types WHERE business_unit_id IS NULL;'"
echo "  3. Tester l'application: https://votre-domaine/mission-types.html"
echo ""
echo "🔄 En cas de problème, restaurez le backup créé par deploy.sh"
echo ""
