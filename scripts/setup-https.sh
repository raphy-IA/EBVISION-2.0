#!/bin/bash

# Script de configuration HTTPS pour EB-Vision 2.0
# Usage: ./scripts/setup-https.sh [domain]

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

# Vérifier que le script est exécuté en tant que root
if [ "$EUID" -ne 0 ]; then
    print_error "Ce script doit être exécuté en tant que root (sudo)"
    exit 1
fi

# Récupérer le domaine
DOMAIN=${1:-"yourdomain.com"}

if [ "$DOMAIN" = "yourdomain.com" ]; then
    print_warning "Domaine par défaut utilisé. Utilisez: $0 yourdomain.com"
    read -p "Voulez-vous continuer avec le domaine par défaut ? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Configuration annulée"
        exit 1
    fi
fi

print_info "Configuration HTTPS pour le domaine: $DOMAIN"

# 1. Mise à jour du système
print_info "1. Mise à jour du système..."
apt update && apt upgrade -y

# 2. Installation de Nginx
print_info "2. Installation de Nginx..."
if ! command -v nginx &> /dev/null; then
    apt install nginx -y
    systemctl enable nginx
    systemctl start nginx
    print_status "Nginx installé et démarré"
else
    print_status "Nginx déjà installé"
fi

# 3. Installation de Certbot
print_info "3. Installation de Certbot..."
if ! command -v certbot &> /dev/null; then
    apt install certbot python3-certbot-nginx -y
    print_status "Certbot installé"
else
    print_status "Certbot déjà installé"
fi

# 4. Configuration Nginx temporaire
print_info "4. Configuration Nginx temporaire..."
cat > /etc/nginx/sites-available/eb-vision << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Activer le site
ln -sf /etc/nginx/sites-available/eb-vision /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Tester et recharger Nginx
nginx -t
systemctl reload nginx
print_status "Configuration Nginx temporaire appliquée"

# 5. Génération du certificat SSL
print_info "5. Génération du certificat SSL avec Let's Encrypt..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

if [ $? -eq 0 ]; then
    print_status "Certificat SSL généré avec succès"
else
    print_error "Échec de la génération du certificat SSL"
    exit 1
fi

# 6. Configuration Nginx finale avec sécurité renforcée
print_info "6. Configuration Nginx finale avec sécurité renforcée..."
cat > /etc/nginx/sites-available/eb-vision << EOF
# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# Configuration HTTPS
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # Certificats SSL
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # Configuration SSL sécurisée
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Headers de sécurité
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy vers l'application Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Gestion des fichiers statiques
    location /static/ {
        alias /var/www/eb-vision/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Recharger Nginx
nginx -t
systemctl reload nginx
print_status "Configuration Nginx finale appliquée"

# 7. Configuration du renouvellement automatique
print_info "7. Configuration du renouvellement automatique..."
cat > /etc/cron.d/certbot-renew << EOF
# Renouvellement automatique des certificats Let's Encrypt
0 12 * * * root /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
EOF

print_status "Renouvellement automatique configuré"

# 8. Configuration du firewall
print_info "8. Configuration du firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 'Nginx Full'
    ufw allow ssh
    ufw --force enable
    print_status "Firewall configuré"
else
    print_warning "UFW non installé, configuration firewall manuelle requise"
fi

# 9. Test de la configuration
print_info "9. Test de la configuration HTTPS..."
sleep 5

# Test de connectivité HTTPS
if curl -s -I https://$DOMAIN | grep -q "200 OK"; then
    print_status "Site accessible en HTTPS"
else
    print_warning "Site non accessible en HTTPS, vérifiez la configuration"
fi

# Test de redirection HTTP
if curl -s -I http://$DOMAIN | grep -q "301 Moved Permanently"; then
    print_status "Redirection HTTP vers HTTPS fonctionne"
else
    print_warning "Redirection HTTP vers HTTPS non fonctionnelle"
fi

# 10. Création du script de monitoring
print_info "10. Création du script de monitoring SSL..."
cat > /opt/eb-vision/monitor-ssl.sh << EOF
#!/bin/bash
# Script de monitoring SSL pour EB-Vision 2.0

DOMAIN="$DOMAIN"
CERT_PATH="/etc/letsencrypt/live/\$DOMAIN/fullchain.pem"

# Vérifier l'expiration du certificat
if [ -f "\$CERT_PATH" ]; then
    EXPIRY_DATE=\$(openssl x509 -enddate -noout -in \$CERT_PATH | cut -d= -f2)
    EXPIRY_EPOCH=\$(date -d "\$EXPIRY_DATE" +%s)
    CURRENT_EPOCH=\$(date +%s)
    DAYS_UNTIL_EXPIRY=\$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
    
    echo "Certificat SSL expire dans \$DAYS_UNTIL_EXPIRY jours"
    
    if [ \$DAYS_UNTIL_EXPIRY -lt 30 ]; then
        echo "⚠️  ALERTE: Certificat SSL expire bientôt !"
        # Envoyer une alerte par email si mail est configuré
        if command -v mail &> /dev/null; then
            echo "Certificat SSL expire dans \$DAYS_UNTIL_EXPIRY jours" | mail -s "Alerte SSL - \$DOMAIN" admin@\$DOMAIN
        fi
    fi
else
    echo "❌ Certificat SSL non trouvé"
fi
EOF

chmod +x /opt/eb-vision/monitor-ssl.sh

# Ajouter à la crontab
(crontab -l 2>/dev/null; echo "0 9 * * * /opt/eb-vision/monitor-ssl.sh") | crontab -

print_status "Script de monitoring SSL créé"

# 11. Résumé de la configuration
echo ""
echo "🎉 CONFIGURATION HTTPS TERMINÉE !"
echo "================================="
echo ""
print_info "Domaine configuré: $DOMAIN"
print_info "Certificat SSL: Let's Encrypt"
print_info "Renouvellement automatique: Configuré"
print_info "Monitoring SSL: Configuré"
echo ""
print_info "URLs de test:"
echo "   - https://$DOMAIN"
echo "   - https://www.$DOMAIN"
echo ""
print_info "Commandes utiles:"
echo "   - Vérifier le statut: systemctl status nginx"
echo "   - Tester la config: nginx -t"
echo "   - Recharger Nginx: systemctl reload nginx"
echo "   - Renouveler le certificat: certbot renew"
echo "   - Vérifier l'expiration: /opt/eb-vision/monitor-ssl.sh"
echo ""
print_warning "N'oubliez pas de:"
echo "   1. Configurer votre application Node.js pour accepter les headers X-Forwarded-Proto"
echo "   2. Tester toutes les fonctionnalités de votre application"
echo "   3. Vérifier que les redirections fonctionnent correctement"
echo ""
print_status "Configuration HTTPS terminée avec succès !"

