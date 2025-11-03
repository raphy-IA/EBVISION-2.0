#!/bin/bash

# Script de déploiement des corrections de sécurité
# Usage: ./scripts/deploy-security-fixes.sh

echo "🚀 DÉPLOIEMENT DES CORRECTIONS DE SÉCURITÉ"
echo "=========================================="
echo ""

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    print_error "Ce script doit être exécuté depuis la racine du projet"
    exit 1
fi

echo "📋 ÉTAPES DE DÉPLOIEMENT:"
echo ""

# 1. Vérifier l'état de Git
print_info "1. Vérification de l'état Git..."
if [ -n "$(git status --porcelain)" ]; then
    print_warning "Des modifications non commitées détectées:"
    git status --short
    echo ""
    read -p "Voulez-vous continuer ? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Déploiement annulé"
        exit 1
    fi
else
    print_status "Aucune modification non commitée"
fi

# 2. Vérifier la branche
print_info "2. Vérification de la branche..."
current_branch=$(git branch --show-current)
print_info "Branche actuelle: $current_branch"

if [ "$current_branch" != "main" ] && [ "$current_branch" != "master" ]; then
    print_warning "Vous n'êtes pas sur la branche principale"
    read -p "Voulez-vous continuer ? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Déploiement annulé"
        exit 1
    fi
fi

# 3. Vérifier les corrections de sécurité
print_info "3. Vérification des corrections de sécurité..."

# Vérifier la clé JWT
if grep -q "JWT_SECRET=dev-secret-key-2024" .env 2>/dev/null; then
    print_error "Clé JWT par défaut détectée dans .env"
    print_warning "Générez une nouvelle clé avec: node scripts/generate-secure-jwt-key.js --update"
    exit 1
else
    print_status "Clé JWT sécurisée configurée"
fi

# Vérifier les credentials supprimés
if grep -q "admin@ebvision.com" public/login.html; then
    print_error "Credentials de démo encore présents dans login.html"
    exit 1
else
    print_status "Credentials de démo supprimés"
fi

# Vérifier le rate limiting
if grep -q "Rate limiting activé pour l'authentification" server.js; then
    print_status "Rate limiting activé"
else
    print_warning "Rate limiting non détecté dans server.js"
fi

# Vérifier les cookies httpOnly
if [ -f "src/middleware/cookieAuth.js" ]; then
    print_status "Middleware cookies httpOnly présent"
else
    print_error "Middleware cookies httpOnly manquant"
    exit 1
fi

# 4. Tests de sécurité
print_info "4. Exécution des tests de sécurité..."

if [ -f "scripts/security-audit-passwords.js" ]; then
    print_info "Audit des mots de passe..."
    node scripts/security-audit-passwords.js > /tmp/security-audit.log 2>&1
    if [ $? -eq 0 ]; then
        print_status "Audit des mots de passe réussi"
        # Afficher le score de sécurité
        score=$(grep "Score:" /tmp/security-audit.log | grep -o '[0-9]*/100' | head -1)
        if [ -n "$score" ]; then
            print_info "Score de sécurité: $score"
        fi
    else
        print_error "Échec de l'audit des mots de passe"
        cat /tmp/security-audit.log
        exit 1
    fi
else
    print_warning "Script d'audit des mots de passe non trouvé"
fi

# 5. Préparation du déploiement
print_info "5. Préparation du déploiement..."

# Créer un tag de version
timestamp=$(date +"%Y%m%d_%H%M%S")
tag_name="security-fix-$timestamp"

print_info "Création du tag: $tag_name"
git tag -a "$tag_name" -m "Corrections de sécurité - $timestamp"

# 6. Instructions de déploiement
echo ""
echo "📋 INSTRUCTIONS DE DÉPLOIEMENT SUR LE SERVEUR:"
echo "=============================================="
echo ""
print_info "1. Sur le serveur de production, exécutez:"
echo "   git fetch origin"
echo "   git checkout $current_branch"
echo "   git pull origin $current_branch"
echo "   git checkout $tag_name"
echo ""
print_info "2. Installez les nouvelles dépendances:"
echo "   npm install"
echo ""
print_info "3. Mettez à jour le fichier .env avec la nouvelle clé JWT:"
echo "   # Copiez la clé JWT depuis votre .env local vers le serveur"
echo ""
print_info "4. Redémarrez l'application:"
echo "   pm2 restart eb-vision"
echo "   # ou selon votre configuration de déploiement"
echo ""
print_info "5. Vérifiez que l'application fonctionne:"
echo "   curl -I http://localhost:3000/api/health"
echo ""

# 7. Checklist de vérification post-déploiement
echo "🔍 CHECKLIST DE VÉRIFICATION POST-DÉPLOIEMENT:"
echo "=============================================="
echo ""
echo "□ L'application démarre sans erreur"
echo "□ La connexion fonctionne avec les nouveaux cookies"
echo "□ Le rate limiting est actif (tester avec plusieurs tentatives)"
echo "□ Les credentials de démo ne sont plus visibles"
echo "□ L'audit de sécurité montre un score > 90/100"
echo "□ Les logs ne montrent pas d'erreurs de sécurité"
echo ""

print_status "Préparation du déploiement terminée !"
print_info "Tag créé: $tag_name"
print_warning "N'oubliez pas de pousser les changements: git push origin $current_branch --tags"










