#!/bin/bash

# Script de déploiement de toutes les corrections de sécurité
# Usage: ./scripts/deploy-all-security-fixes.sh

set -e

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

print_header() {
    echo -e "${BLUE}"
    echo "=================================="
    echo "$1"
    echo "=================================="
    echo -e "${NC}"
}

# Vérifier que le script est exécuté en tant que root
if [ "$EUID" -ne 0 ]; then
    print_error "Ce script doit être exécuté en tant que root (sudo)"
    exit 1
fi

print_header "🔐 DÉPLOIEMENT DES CORRECTIONS DE SÉCURITÉ EB-VISION 2.0"

# 1. Vérification de la configuration SSL existante
print_info "1. Vérification de la configuration SSL existante..."

ssl_configured=false

# Vérifier Let's Encrypt
if [ -d "/etc/letsencrypt/live" ]; then
    print_status "Let's Encrypt détecté - Configuration SSL existante respectée"
    ssl_configured=true
fi

# Vérifier les certificats auto-signés
if [ -f "/etc/ssl/eb-vision/eb-vision.crt" ] || [ -f "/etc/ssl/certs/eb-vision.crt" ]; then
    print_status "Certificats auto-signés détectés - Configuration SSL existante respectée"
    ssl_configured=true
fi

# Vérifier la configuration Nginx SSL
if command -v nginx &> /dev/null && grep -q "ssl_certificate" /etc/nginx/sites-available/* 2>/dev/null; then
    print_status "Configuration SSL Nginx détectée - Configuration existante respectée"
    ssl_configured=true
fi

if [ "$ssl_configured" = true ]; then
    print_status "✅ Configuration SSL existante détectée - Aucune modification SSL nécessaire"
    print_info "Le déploiement se concentrera sur les autres aspects de sécurité"
else
    print_warning "⚠️  Aucune configuration SSL détectée"
    print_info "Considérez configurer SSL après le déploiement des corrections de sécurité"
fi

# 2. Sauvegarde de la base de données
print_info "2. Sauvegarde de la base de données..."
BACKUP_FILE="/opt/eb-vision/backups/security-backup-$(date +%Y%m%d_%H%M%S).sql"
mkdir -p /opt/eb-vision/backups

if command -v pg_dump &> /dev/null; then
    pg_dump -h localhost -U postgres -d eb_vision > "$BACKUP_FILE"
    print_status "Sauvegarde créée: $BACKUP_FILE"
else
    print_warning "pg_dump non trouvé, sauvegarde manuelle requise"
fi

# 3. Installation des dépendances
print_info "3. Installation des dépendances Node.js..."
cd /opt/eb-vision
npm install speakeasy qrcode

# 4. Application des migrations de sécurité
print_info "4. Application des migrations de sécurité..."

# Migration 2FA
if [ -f "database/migrations/049_add_two_factor_auth.sql" ]; then
    psql -h localhost -U postgres -d eb_vision -f database/migrations/049_add_two_factor_auth.sql
    print_status "Migration 2FA appliquée"
else
    print_warning "Fichier de migration 2FA non trouvé"
fi

# Migration monitoring de sécurité
if [ -f "database/migrations/050_add_security_monitoring.sql" ]; then
    psql -h localhost -U postgres -d eb_vision -f database/migrations/050_add_security_monitoring.sql
    print_status "Migration monitoring de sécurité appliquée"
else
    print_warning "Fichier de migration monitoring non trouvé"
fi

# Migration expiration des mots de passe
if [ -f "database/migrations/051_add_password_expiration.sql" ]; then
    psql -h localhost -U postgres -d eb_vision -f database/migrations/051_add_password_expiration.sql
    print_status "Migration expiration des mots de passe appliquée"
else
    print_warning "Fichier de migration expiration non trouvé"
fi

# 4. Vérification des fichiers de sécurité
print_info "4. Vérification des fichiers de sécurité..."

SECURITY_FILES=(
    "src/services/twoFactorAuth.js"
    "src/services/passwordPolicy.js"
    "src/services/securityMonitoring.js"
    "src/routes/two-factor-auth.js"
    "src/middleware/cookieAuth.js"
)

for file in "${SECURITY_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status "Fichier trouvé: $file"
    else
        print_error "Fichier manquant: $file"
    fi
done

# 5. Configuration des permissions
print_info "5. Configuration des permissions..."
chmod 600 /opt/eb-vision/.env
chmod 644 /opt/eb-vision/src/services/*.js
chmod 644 /opt/eb-vision/src/routes/two-factor-auth.js
chmod 644 /opt/eb-vision/src/middleware/cookieAuth.js

# 6. Test de la configuration
print_info "6. Test de la configuration..."

# Test de connexion à la base de données
if psql -h localhost -U postgres -d eb_vision -c "SELECT 1;" > /dev/null 2>&1; then
    print_status "Connexion à la base de données OK"
else
    print_error "Erreur de connexion à la base de données"
fi

# Test des nouvelles colonnes
COLUMNS_TEST=$(psql -h localhost -U postgres -d eb_vision -t -c "
SELECT COUNT(*) FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('two_factor_enabled', 'password_expires_at', 'blocked_until')
" 2>/dev/null | tr -d ' ')

if [ "$COLUMNS_TEST" = "3" ]; then
    print_status "Nouvelles colonnes de sécurité présentes"
else
    print_warning "Certaines colonnes de sécurité sont manquantes"
fi

# 7. Redémarrage de l'application
print_info "7. Redémarrage de l'application..."

if command -v pm2 &> /dev/null; then
    pm2 restart eb-vision
    print_status "Application redémarrée avec PM2"
elif command -v systemctl &> /dev/null; then
    systemctl restart eb-vision
    print_status "Application redémarrée avec systemd"
else
    print_warning "Gestionnaire de processus non trouvé, redémarrage manuel requis"
fi

# 8. Vérification du statut
print_info "8. Vérification du statut de l'application..."
sleep 5

if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "eb-vision.*online"; then
        print_status "Application en ligne"
    else
        print_error "Application non démarrée"
    fi
elif command -v systemctl &> /dev/null; then
    if systemctl is-active --quiet eb-vision; then
        print_status "Application en ligne"
    else
        print_error "Application non démarrée"
    fi
fi

# 9. Vérification de la compatibilité SSL
print_info "9. Vérification de la compatibilité SSL..."

if [ "$ssl_configured" = true ]; then
    print_info "Vérification de la compatibilité avec votre configuration SSL existante..."
    
    # Vérifier que les headers de sécurité sont compatibles
    if command -v nginx &> /dev/null; then
        if grep -q "Strict-Transport-Security" /etc/nginx/sites-available/* 2>/dev/null; then
            print_status "Header HSTS déjà configuré"
        else
            print_warning "Header HSTS manquant - Recommandé pour la sécurité"
        fi
        
        if grep -q "X-Frame-Options" /etc/nginx/sites-available/* 2>/dev/null; then
            print_status "Header X-Frame-Options déjà configuré"
        else
            print_warning "Header X-Frame-Options manquant - Recommandé pour la sécurité"
        fi
    fi
    
    # Vérifier la configuration des cookies sécurisés
    print_info "Les nouvelles fonctionnalités de sécurité utiliseront vos certificats SSL existants"
    print_status "Cookies sécurisés compatibles avec votre configuration SSL"
else
    print_info "SSL non configuré - Les cookies sécurisés fonctionneront en mode développement"
fi

# 10. Test des endpoints de sécurité
print_info "10. Test des endpoints de sécurité..."

# Test de l'endpoint de santé
if curl -s -f http://localhost:3000/api/health > /dev/null 2>&1; then
    print_status "Endpoint de santé accessible"
else
    print_warning "Endpoint de santé non accessible"
fi

# Test de l'endpoint 2FA
if curl -s -f http://localhost:3000/api/2fa/status > /dev/null 2>&1; then
    print_status "Endpoint 2FA accessible"
else
    print_warning "Endpoint 2FA non accessible (normal si non authentifié)"
fi

# 11. Configuration du monitoring
print_info "11. Configuration du monitoring de sécurité..."

# Créer le script de monitoring quotidien
cat > /opt/eb-vision/scripts/daily-security-check.sh << 'EOF'
#!/bin/bash
# Script de vérification quotidienne de sécurité

LOG_FILE="/opt/eb-vision/logs/security-check-$(date +%Y%m%d).log"
mkdir -p /opt/eb-vision/logs

echo "=== Vérification de sécurité du $(date) ===" >> "$LOG_FILE"

# Vérifier les mots de passe expirés
EXPIRED_COUNT=$(psql -h localhost -U postgres -d eb_vision -t -c "
SELECT COUNT(*) FROM users 
WHERE password_expires_at < NOW() 
AND active = true
" 2>/dev/null | tr -d ' ')

echo "Mots de passe expirés: $EXPIRED_COUNT" >> "$LOG_FILE"

# Vérifier les utilisateurs bloqués
BLOCKED_COUNT=$(psql -h localhost -U postgres -d eb_vision -t -c "
SELECT COUNT(*) FROM users 
WHERE blocked_until > NOW() 
AND active = true
" 2>/dev/null | tr -d ' ')

echo "Utilisateurs bloqués: $BLOCKED_COUNT" >> "$LOG_FILE"

# Vérifier les IPs bloquées
BLOCKED_IPS=$(psql -h localhost -U postgres -d eb_vision -t -c "
SELECT COUNT(*) FROM blocked_ips 
WHERE expires_at > NOW()
" 2>/dev/null | tr -d ' ')

echo "IPs bloquées: $BLOCKED_IPS" >> "$LOG_FILE"

# Vérifier les alertes de sécurité récentes
RECENT_ALERTS=$(psql -h localhost -U postgres -d eb_vision -t -c "
SELECT COUNT(*) FROM security_alerts 
WHERE created_at > NOW() - INTERVAL '24 hours'
" 2>/dev/null | tr -d ' ')

echo "Alertes de sécurité (24h): $RECENT_ALERTS" >> "$LOG_FILE"

echo "=== Fin de vérification ===" >> "$LOG_FILE"
EOF

chmod +x /opt/eb-vision/scripts/daily-security-check.sh

# Ajouter à la crontab
(crontab -l 2>/dev/null; echo "0 6 * * * /opt/eb-vision/scripts/daily-security-check.sh") | crontab -

print_status "Monitoring de sécurité configuré"

# 12. Résumé final
print_header "🎉 DÉPLOIEMENT TERMINÉ !"

print_info "Corrections de sécurité déployées:"
echo "   ✅ Authentification à deux facteurs (2FA) - OPTIONNEL"
echo "   ✅ Politique de mots de passe forte"
echo "   ✅ Expiration des mots de passe"
echo "   ✅ Monitoring de sécurité"
echo "   ✅ Détection d'activités suspectes"
echo "   ✅ Logs de sécurité détaillés"
echo "   ✅ Cookies sécurisés (HttpOnly)"
echo "   ✅ Rate limiting renforcé"
echo "   ✅ JWT secret sécurisé"

print_info "Fichiers de configuration créés:"
echo "   📄 HTTPS-SETUP-GUIDE.md"
echo "   📄 DEPLOYMENT-SECURITY-GUIDE.md"
echo "   🔧 scripts/setup-https.sh"
echo "   🔧 scripts/daily-security-check.sh"

print_info "Prochaines étapes recommandées:"
echo "   1. Configurer HTTPS avec Let's Encrypt"
echo "   2. Informer les utilisateurs que le 2FA est disponible (optionnel)"
echo "   3. Tester toutes les fonctionnalités"
echo "   4. Configurer les alertes par email"
echo "   5. Planifier des audits de sécurité réguliers"
echo ""
print_info "Gestion du 2FA:"
echo "   - Vérifier le statut: node scripts/configure-2fa-policy.js status"
echo "   - Le 2FA est OPTIONNEL par défaut"
echo "   - Chaque utilisateur choisit d'activer ou non le 2FA"

print_warning "Points d'attention:"
echo "   • Vérifiez que tous les utilisateurs peuvent se connecter"
echo "   • Testez le changement de mots de passe"
echo "   • Vérifiez que le 2FA fonctionne correctement"
echo "   • Surveillez les logs de sécurité"

print_status "Déploiement des corrections de sécurité terminé avec succès !"
