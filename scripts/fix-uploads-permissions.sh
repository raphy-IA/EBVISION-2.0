#!/bin/bash

# Script pour corriger les permissions des uploads
# Usage: ./scripts/fix-uploads-permissions.sh

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo -e "${BLUE}"
    echo "=================================="
    echo "$1"
    echo "=================================="
    echo -e "${NC}"
}

print_header "🔧 CORRECTION DES PERMISSIONS UPLOADS"

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "server.js" ]; then
    echo "❌ Ce script doit être exécuté depuis la racine du projet EB-Vision"
    exit 1
fi

# Créer le répertoire uploads s'il n'existe pas
if [ ! -d "uploads" ]; then
    print_info "Création du répertoire uploads..."
    mkdir -p uploads
    print_status "Répertoire uploads créé"
fi

# Créer les sous-répertoires nécessaires
print_info "Création des sous-répertoires..."
mkdir -p uploads/photos
mkdir -p uploads/documents
mkdir -p uploads/temp

# Définir les permissions sécurisées
print_info "Définition des permissions sécurisées..."

# Permissions pour le répertoire principal
chmod 755 uploads
print_status "Permissions uploads: 755"

# Permissions pour les sous-répertoires
chmod 755 uploads/photos
chmod 755 uploads/documents
chmod 755 uploads/temp
print_status "Permissions sous-répertoires: 755"

# Vérifier les permissions
print_info "Vérification des permissions..."

UPLOADS_PERMS=$(stat -c "%a" uploads 2>/dev/null || echo "non trouvé")
PHOTOS_PERMS=$(stat -c "%a" uploads/photos 2>/dev/null || echo "non trouvé")
DOCS_PERMS=$(stat -c "%a" uploads/documents 2>/dev/null || echo "non trouvé")

echo "   📁 uploads: $UPLOADS_PERMS"
echo "   📁 uploads/photos: $PHOTOS_PERMS"
echo "   📁 uploads/documents: $DOCS_PERMS"

# Vérifier que les permissions sont correctes
if [ "$UPLOADS_PERMS" = "755" ] && [ "$PHOTOS_PERMS" = "755" ] && [ "$DOCS_PERMS" = "755" ]; then
    print_status "Toutes les permissions sont correctes"
else
    print_warning "Certaines permissions ne sont pas optimales"
fi

# Créer un fichier .htaccess pour la sécurité (si Apache)
if [ -f "public/.htaccess" ] || command -v apache2 &> /dev/null; then
    print_info "Création du fichier .htaccess pour uploads..."
    cat > uploads/.htaccess << 'EOF'
# Sécurité pour le répertoire uploads
Options -Indexes
Options -ExecCGI
AddHandler cgi-script .php .pl .py .jsp .asp .sh .cgi

# Empêcher l'exécution de scripts
<FilesMatch "\.(php|pl|py|jsp|asp|sh|cgi)$">
    Order Deny,Allow
    Deny from all
</FilesMatch>

# Types MIME sécurisés
<FilesMatch "\.(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx|txt)$">
    Order Allow,Deny
    Allow from all
</FilesMatch>
EOF
    print_status "Fichier .htaccess créé pour la sécurité"
fi

print_header "🎉 PERMISSIONS CORRIGÉES"

print_info "Résumé des corrections:"
echo "   ✅ Répertoire uploads créé/vérifié"
echo "   ✅ Sous-répertoires créés"
echo "   ✅ Permissions sécurisées (755)"
echo "   ✅ Fichier .htaccess ajouté (si applicable)"

print_info "Permissions appliquées:"
echo "   📁 uploads: 755 (rwxr-xr-x)"
echo "   📁 uploads/photos: 755"
echo "   📁 uploads/documents: 755"
echo "   📁 uploads/temp: 755"

print_status "Permissions des uploads corrigées avec succès !"

