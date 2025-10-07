#!/bin/bash

# Script de vérification de la configuration SSL existante
# Usage: ./scripts/verify-existing-ssl.sh [domain]

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

# Récupérer le domaine
DOMAIN=${1:-"localhost"}

print_header "🔍 VÉRIFICATION DE LA CONFIGURATION SSL EXISTANTE"

# 1. Vérifier les certificats SSL installés
print_info "1. Vérification des certificats SSL..."

# Vérifier Let's Encrypt
if [ -d "/etc/letsencrypt/live" ]; then
    print_status "Let's Encrypt détecté"
    
    # Lister les certificats Let's Encrypt
    echo "Certificats Let's Encrypt trouvés:"
    for cert_dir in /etc/letsencrypt/live/*/; do
        if [ -d "$cert_dir" ]; then
            domain_name=$(basename "$cert_dir")
            cert_file="$cert_dir/fullchain.pem"
            key_file="$cert_dir/privkey.pem"
            
            if [ -f "$cert_file" ] && [ -f "$key_file" ]; then
                print_status "  - $domain_name"
                
                # Vérifier la validité du certificat
                if openssl x509 -in "$cert_file" -text -noout > /dev/null 2>&1; then
                    expiry_date=$(openssl x509 -in "$cert_file" -enddate -noout | cut -d= -f2)
                    print_info "    Expire le: $expiry_date"
                else
                    print_error "    Certificat invalide"
                fi
            else
                print_warning "    Fichiers de certificat manquants"
            fi
        fi
    done
else
    print_warning "Let's Encrypt non détecté"
fi

# Vérifier les certificats auto-signés
if [ -d "/etc/ssl/certs" ]; then
    echo ""
    print_info "Certificats système trouvés:"
    find /etc/ssl/certs -name "*.crt" -o -name "*.pem" | head -5 | while read cert; do
        if [ -f "$cert" ]; then
            cert_name=$(basename "$cert")
            print_info "  - $cert_name"
        fi
    done
fi

# 2. Vérifier la configuration Nginx
print_info "2. Vérification de la configuration Nginx..."

if command -v nginx &> /dev/null; then
    print_status "Nginx installé"
    
    # Vérifier la configuration SSL dans Nginx
    if [ -f "/etc/nginx/sites-available/default" ]; then
        if grep -q "ssl_certificate" /etc/nginx/sites-available/default; then
            print_status "Configuration SSL trouvée dans Nginx"
            
            # Extraire les chemins des certificats
            ssl_cert=$(grep "ssl_certificate " /etc/nginx/sites-available/default | head -1 | awk '{print $2}' | sed 's/;//')
            ssl_key=$(grep "ssl_certificate_key " /etc/nginx/sites-available/default | head -1 | awk '{print $2}' | sed 's/;//')
            
            if [ -n "$ssl_cert" ] && [ -f "$ssl_cert" ]; then
                print_status "Certificat SSL: $ssl_cert"
            else
                print_warning "Certificat SSL non trouvé ou chemin invalide"
            fi
            
            if [ -n "$ssl_key" ] && [ -f "$ssl_key" ]; then
                print_status "Clé privée SSL: $ssl_key"
            else
                print_warning "Clé privée SSL non trouvée ou chemin invalide"
            fi
        else
            print_warning "Configuration SSL non trouvée dans Nginx"
        fi
    else
        print_warning "Fichier de configuration Nginx par défaut non trouvé"
    fi
    
    # Vérifier le statut de Nginx
    if systemctl is-active --quiet nginx; then
        print_status "Nginx en cours d'exécution"
    else
        print_warning "Nginx non démarré"
    fi
else
    print_warning "Nginx non installé"
fi

# 3. Vérifier Apache (alternative)
print_info "3. Vérification d'Apache (si installé)..."

if command -v apache2 &> /dev/null || command -v httpd &> /dev/null; then
    print_status "Apache détecté"
    
    # Vérifier les modules SSL
    if apache2ctl -M 2>/dev/null | grep -q ssl || httpd -M 2>/dev/null | grep -q ssl; then
        print_status "Module SSL Apache activé"
    else
        print_warning "Module SSL Apache non activé"
    fi
else
    print_info "Apache non installé"
fi

# 4. Vérifier les ports SSL
print_info "4. Vérification des ports SSL..."

# Vérifier le port 443 (HTTPS)
if netstat -tlnp 2>/dev/null | grep -q ":443 "; then
    print_status "Port 443 (HTTPS) ouvert"
    netstat -tlnp 2>/dev/null | grep ":443 " | while read line; do
        print_info "  $line"
    done
else
    print_warning "Port 443 (HTTPS) non ouvert"
fi

# Vérifier le port 80 (HTTP)
if netstat -tlnp 2>/dev/null | grep -q ":80 "; then
    print_status "Port 80 (HTTP) ouvert"
else
    print_warning "Port 80 (HTTP) non ouvert"
fi

# 5. Test de connectivité SSL
print_info "5. Test de connectivité SSL..."

if [ "$DOMAIN" != "localhost" ]; then
    # Test avec un domaine réel
    if command -v curl &> /dev/null; then
        print_info "Test de connexion HTTPS vers $DOMAIN..."
        
        if curl -s -I "https://$DOMAIN" > /dev/null 2>&1; then
            print_status "Connexion HTTPS réussie vers $DOMAIN"
            
            # Vérifier la redirection HTTP vers HTTPS
            if curl -s -I "http://$DOMAIN" | grep -q "301\|302"; then
                print_status "Redirection HTTP vers HTTPS configurée"
            else
                print_warning "Redirection HTTP vers HTTPS non configurée"
            fi
        else
            print_warning "Connexion HTTPS échouée vers $DOMAIN"
        fi
        
        # Vérifier les headers de sécurité
        print_info "Vérification des headers de sécurité..."
        headers=$(curl -s -I "https://$DOMAIN" 2>/dev/null)
        
        if echo "$headers" | grep -q "Strict-Transport-Security"; then
            print_status "Header HSTS présent"
        else
            print_warning "Header HSTS manquant"
        fi
        
        if echo "$headers" | grep -q "X-Frame-Options"; then
            print_status "Header X-Frame-Options présent"
        else
            print_warning "Header X-Frame-Options manquant"
        fi
        
    else
        print_warning "curl non installé, tests de connectivité ignorés"
    fi
else
    print_info "Tests de connectivité ignorés pour localhost"
fi

# 6. Vérifier les certificats auto-signés locaux
print_info "6. Vérification des certificats auto-signés..."

if [ -f "/etc/ssl/eb-vision/eb-vision.crt" ]; then
    print_status "Certificat auto-signé EB-Vision trouvé"
    
    if openssl x509 -in "/etc/ssl/eb-vision/eb-vision.crt" -text -noout > /dev/null 2>&1; then
        expiry_date=$(openssl x509 -in "/etc/ssl/eb-vision/eb-vision.crt" -enddate -noout | cut -d= -f2)
        print_info "Expire le: $expiry_date"
    else
        print_error "Certificat auto-signé invalide"
    fi
else
    print_info "Certificat auto-signé EB-Vision non trouvé"
fi

# 7. Vérifier la configuration du firewall
print_info "7. Vérification du firewall..."

if command -v ufw &> /dev/null; then
    print_status "UFW détecté"
    
    if ufw status | grep -q "443/tcp"; then
        print_status "Port 443 autorisé dans UFW"
    else
        print_warning "Port 443 non autorisé dans UFW"
    fi
    
    if ufw status | grep -q "80/tcp"; then
        print_status "Port 80 autorisé dans UFW"
    else
        print_warning "Port 80 non autorisé dans UFW"
    fi
elif command -v iptables &> /dev/null; then
    print_info "iptables détecté"
    
    if iptables -L | grep -q "443"; then
        print_status "Règles iptables pour le port 443 trouvées"
    else
        print_warning "Aucune règle iptables pour le port 443"
    fi
else
    print_warning "Aucun firewall détecté"
fi

# 8. Recommandations
print_header "📋 RECOMMANDATIONS"

ssl_configured=false

# Vérifier si SSL est configuré
if [ -d "/etc/letsencrypt/live" ] || [ -f "/etc/ssl/eb-vision/eb-vision.crt" ] || (command -v nginx &> /dev/null && grep -q "ssl_certificate" /etc/nginx/sites-available/default 2>/dev/null); then
    ssl_configured=true
fi

if [ "$ssl_configured" = true ]; then
    print_status "Configuration SSL détectée !"
    echo ""
    print_info "Votre serveur semble déjà configuré avec SSL."
    print_info "Le script de déploiement des corrections de sécurité va:"
    echo "   ✅ Respecter votre configuration SSL existante"
    echo "   ✅ Ne pas modifier vos certificats"
    echo "   ✅ Se concentrer sur les autres aspects de sécurité"
    echo "   ✅ Vérifier que votre SSL fonctionne correctement"
    echo ""
    print_info "Vous pouvez procéder en toute sécurité au déploiement des corrections."
else
    print_warning "Aucune configuration SSL détectée"
    echo ""
    print_info "Recommandations:"
    echo "   1. Configurer SSL avec Let's Encrypt (recommandé)"
    echo "   2. Ou utiliser des certificats auto-signés pour le développement"
    echo "   3. Puis déployer les corrections de sécurité"
    echo ""
    print_info "Scripts disponibles:"
    echo "   - ./scripts/setup-https.sh yourdomain.com (Let's Encrypt)"
    echo "   - ./scripts/deploy-all-security-fixes.sh (corrections de sécurité)"
fi

# 9. Résumé
print_header "📊 RÉSUMÉ DE LA VÉRIFICATION SSL"

echo "Configuration SSL: $([ "$ssl_configured" = true ] && echo "✅ Détectée" || echo "❌ Non détectée")"
echo "Let's Encrypt: $([ -d "/etc/letsencrypt/live" ] && echo "✅ Installé" || echo "❌ Non installé")"
echo "Nginx: $(command -v nginx &> /dev/null && echo "✅ Installé" || echo "❌ Non installé")"
echo "Port 443: $(netstat -tlnp 2>/dev/null | grep -q ":443 " && echo "✅ Ouvert" || echo "❌ Fermé")"
echo "Port 80: $(netstat -tlnp 2>/dev/null | grep -q ":80 " && echo "✅ Ouvert" || echo "❌ Fermé")"

print_status "Vérification SSL terminée !"


