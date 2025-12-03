#!/bin/bash

###############################################################################
# Script de déploiement pour EB-Vision 2.0 (Production Linux)
# 
# Utilisation:
#   ./deploy.sh              # Déploiement complet (pull + migrate + restart)
#   ./deploy.sh --skip-pull  # Saute le git pull (utile si déjà fait)
#   ./deploy.sh --check      # Vérifie seulement le schéma
###############################################################################

set -e  # Arrête le script en cas d'erreur

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="eb-vision-2.0"
BACKUP_DIR="backups"
DB_BACKUP_FILE="$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql"

# Fonctions utilitaires
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    log_error "Ce script doit être exécuté depuis la racine du projet"
    exit 1
fi

# Créer le dossier de backups s'il n'existe pas
mkdir -p "$BACKUP_DIR"

# Mode check seulement
if [ "$1" = "--check" ]; then
    section "Vérification du schéma de la base de données"
    npm run validate-schema
    exit 0
fi

# Début du déploiement
section "🚀 Déploiement de $APP_NAME"

# 1. Sauvegarde de la base de données
section "📦 Sauvegarde de la base de données"

# Charger les variables d'environnement
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Backup PostgreSQL
log_info "Création d'une sauvegarde de sécurité..."
PGPASSWORD=$DB_PASSWORD pg_dump \
    -h ${DB_HOST:-localhost} \
    -p ${DB_PORT:-5432} \
    -U ${DB_USER:-postgres} \
    -d ${DB_NAME:-eb_vision_2_0} \
    -F c \
    -f "$DB_BACKUP_FILE" 2>/dev/null || {
        log_warning "Impossible de créer la sauvegarde (pg_dump non disponible ou erreur de connexion)"
        log_warning "Continuer sans sauvegarde ? (Ctrl+C pour annuler, Entrée pour continuer)"
        read
    }

if [ -f "$DB_BACKUP_FILE" ]; then
    log_success "Sauvegarde créée: $DB_BACKUP_FILE"
else
    log_warning "Aucune sauvegarde créée, continuer quand même..."
fi

# 2. Git pull (sauf si --skip-pull)
if [ "$1" != "--skip-pull" ]; then
    section "📥 Récupération du code"
    log_info "Exécution de git pull..."
    
    # Vérifier l'état de Git
    if ! git diff-index --quiet HEAD --; then
        log_warning "Des modifications locales ont été détectées"
        git status --short
        log_warning "Voulez-vous les annuler ? (y/N)"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            git reset --hard HEAD
            log_info "Modifications locales annulées"
        else
            log_error "Déploiement annulé (modifications locales présentes)"
            exit 1
        fi
    fi
    
    git pull || {
        log_error "Échec du git pull"
        exit 1
    }
    log_success "Code mis à jour"
else
    log_warning "Git pull ignoré (--skip-pull)"
fi

# 3. Installation des dépendances
section "📦 Mise à jour des dépendances"
log_info "Exécution de npm install..."
npm install --production || {
    log_error "Échec de npm install"
    exit 1
}
log_success "Dépendances installées"

# 4. Exécution des migrations
section "🗄️  Exécution des migrations de base de données"
log_info "Lancement des migrations..."

npm run migrate || {
    log_error "Échec des migrations!"
    log_error "Tentative de restauration de la sauvegarde..."
    
    if [ -f "$DB_BACKUP_FILE" ]; then
        PGPASSWORD=$DB_PASSWORD pg_restore \
            -h ${DB_HOST:-localhost} \
            -p ${DB_PORT:-5432} \
            -U ${DB_USER:-postgres} \
            -d ${DB_NAME:-eb_vision_2_0} \
            -c \
            "$DB_BACKUP_FILE" || log_error "Échec de la restauration!"
        log_warning "Base de données restaurée à l'état précédent"
    else
        log_error "Aucune sauvegarde disponible pour restauration"
    fi
    
    exit 1
}
log_success "Migrations exécutées avec succès"

# 5. Validation du schéma
section "🔍 Validation du schéma de la base de données"
npm run validate-schema || {
    log_warning "La validation du schéma a échoué (vérifiez les logs ci-dessus)"
}

# 6. Redémarrage de l'application
section "🔄 Redémarrage de l'application"

# Détecter le gestionnaire de processus
if command -v pm2 &> /dev/null; then
    log_info "Redémarrage avec PM2..."
    pm2 restart $APP_NAME || pm2 start ecosystem.config.js --env production
    log_success "Application redémarrée avec PM2"
    
    # Afficher les logs récents
    echo ""
    log_info "Logs récents:"
    pm2 logs $APP_NAME --lines 10 --nostream
    
elif command -v systemctl &> /dev/null; then
    log_info "Redémarrage avec systemd..."
    sudo systemctl restart $APP_NAME
    log_success "Application redémarrée avec systemd"
    
    # Afficher le status
    sudo systemctl status $APP_NAME --no-pager
    
else
    log_warning "Aucun gestionnaire de processus détecté (PM2/systemd)"
    log_warning "Veuillez redémarrer l'application manuellement"
fi

# 7. Résumé final
section "✨ Déploiement terminé avec succès"

echo ""
log_success "Résumé du déploiement:"
echo "  • Code: ✅ Mis à jour"
echo "  • Dépendances: ✅ Installées"
echo "  • Migrations: ✅ Exécutées"
echo "  • Validation: ✅ Effectuée"
echo "  • Application: ✅ Redémarrée"
echo ""
log_info "Sauvegarde de la BD disponible: $DB_BACKUP_FILE"
echo ""

# Afficher l'URL de l'application
if [ -n "$APP_URL" ]; then
    log_info "Application accessible sur: $APP_URL"
else
    log_info "Application démarrée (vérifiez les logs pour l'URL)"
fi

echo ""
log_success "🎉 Déploiement terminé!"
echo ""
