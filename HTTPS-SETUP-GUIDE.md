# 🔒 Guide de Configuration HTTPS

## 📋 Vue d'ensemble

Ce guide vous accompagne pour configurer HTTPS sur votre serveur EB-Vision 2.0 avec des certificats SSL/TLS sécurisés.

## 🎯 Objectifs

- ✅ Chiffrement des communications client-serveur
- ✅ Authentification du serveur
- ✅ Intégrité des données transmises
- ✅ Conformité aux standards de sécurité

---

## 🔧 Méthodes de Configuration

### 1. **Let's Encrypt (Recommandé - Gratuit)**

#### A. Installation de Certbot
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx

# Ou avec snap (universel)
sudo snap install --classic certbot
```

#### B. Génération du certificat
```bash
# Pour un domaine avec Nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Pour un domaine sans Nginx (standalone)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

#### C. Renouvellement automatique
```bash
# Tester le renouvellement
sudo certbot renew --dry-run

# Ajouter à la crontab pour renouvellement automatique
sudo crontab -e
# Ajouter cette ligne :
0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. **Certificat Auto-signé (Développement)**

#### A. Génération du certificat
```bash
# Créer le répertoire pour les certificats
sudo mkdir -p /etc/ssl/eb-vision
cd /etc/ssl/eb-vision

# Générer la clé privée
sudo openssl genrsa -out eb-vision.key 2048

# Générer le certificat auto-signé
sudo openssl req -new -x509 -key eb-vision.key -out eb-vision.crt -days 365 -subj "/C=FR/ST=France/L=Paris/O=EB-Vision/CN=yourdomain.com"
```

#### B. Permissions
```bash
sudo chmod 600 eb-vision.key
sudo chmod 644 eb-vision.crt
sudo chown root:root eb-vision.*
```

---

## 🚀 Configuration du Serveur Node.js

### 1. **Installation des dépendances HTTPS**
```bash
npm install https
```

### 2. **Modification du serveur principal**

Créer un fichier `server-https.js` :

```javascript
const https = require('https');
const fs = require('fs');
const app = require('./server'); // Votre application Express

// Configuration HTTPS
const httpsOptions = {
    key: fs.readFileSync('/etc/ssl/eb-vision/eb-vision.key'),
    cert: fs.readFileSync('/etc/ssl/eb-vision/eb-vision.crt'),
    // Pour Let's Encrypt :
    // key: fs.readFileSync('/etc/letsencrypt/live/yourdomain.com/privkey.pem'),
    // cert: fs.readFileSync('/etc/letsencrypt/live/yourdomain.com/fullchain.pem'),
    
    // Configuration de sécurité
    secureProtocol: 'TLSv1_2_method',
    ciphers: [
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES128-SHA256',
        'ECDHE-RSA-AES256-SHA384'
    ].join(':'),
    honorCipherOrder: true
};

// Créer le serveur HTTPS
const httpsServer = https.createServer(httpsOptions, app);

const PORT = process.env.HTTPS_PORT || 443;
const HOST = process.env.HOST || '0.0.0.0';

httpsServer.listen(PORT, HOST, () => {
    console.log(`🔒 Serveur HTTPS démarré sur https://${HOST}:${PORT}`);
    console.log('✅ Certificat SSL chargé avec succès');
});

// Gestion des erreurs
httpsServer.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} déjà utilisé`);
    } else {
        console.error('❌ Erreur serveur HTTPS:', error);
    }
});

module.exports = httpsServer;
```

### 3. **Redirection HTTP vers HTTPS**

Ajouter au début de votre `server.js` :

```javascript
// Redirection HTTP vers HTTPS (en production)
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
}
```

---

## 🔧 Configuration Nginx (Recommandé)

### 1. **Installation de Nginx**
```bash
# Ubuntu/Debian
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 2. **Configuration Nginx pour HTTPS**

Créer `/etc/nginx/sites-available/eb-vision` :

```nginx
# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# Configuration HTTPS
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # Certificats SSL
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

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
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Gestion des fichiers statiques
    location /static/ {
        alias /path/to/eb-vision/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3. **Activation de la configuration**
```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/eb-vision /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 🔍 Vérification de la Configuration

### 1. **Test de connectivité HTTPS**
```bash
# Test basique
curl -I https://yourdomain.com

# Test avec vérification SSL
curl -I --cacert /etc/ssl/certs/ca-certificates.crt https://yourdomain.com
```

### 2. **Analyse de sécurité SSL**
```bash
# Installation de SSL Labs CLI
npm install -g ssllabs-cli

# Analyse du certificat
ssllabs-cli analyze yourdomain.com
```

### 3. **Vérification des headers de sécurité**
```bash
# Vérifier les headers
curl -I https://yourdomain.com | grep -E "(Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options)"
```

---

## 🚨 Dépannage

### Problèmes Courants

#### 1. **Erreur "Certificate not trusted"**
```bash
# Vérifier la chaîne de certificats
openssl s_client -connect yourdomain.com:443 -showcerts

# Vérifier la validité du certificat
openssl x509 -in /path/to/certificate.crt -text -noout
```

#### 2. **Erreur "SSL handshake failed"**
```bash
# Vérifier les protocoles supportés
nmap --script ssl-enum-ciphers -p 443 yourdomain.com

# Tester avec différents protocoles
openssl s_client -connect yourdomain.com:443 -tls1_2
```

#### 3. **Redirection infinie**
- Vérifier la configuration de redirection
- S'assurer que les headers X-Forwarded-Proto sont corrects
- Vérifier la configuration du proxy

---

## 📊 Monitoring HTTPS

### 1. **Script de monitoring**
```bash
#!/bin/bash
# /opt/eb-vision/monitor-ssl.sh

DOMAIN="yourdomain.com"
CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"

# Vérifier l'expiration du certificat
EXPIRY_DATE=$(openssl x509 -enddate -noout -in $CERT_PATH | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))

echo "Certificat SSL expire dans $DAYS_UNTIL_EXPIRY jours"

if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
    echo "⚠️  ALERTE: Certificat SSL expire bientôt !"
    # Envoyer une alerte par email
    echo "Certificat SSL expire dans $DAYS_UNTIL_EXPIRY jours" | mail -s "Alerte SSL" admin@yourcompany.com
fi
```

### 2. **Cron job pour monitoring**
```bash
# Ajouter à la crontab
0 9 * * * /opt/eb-vision/monitor-ssl.sh
```

---

## ✅ Checklist de Configuration

### Avant la Configuration
- [ ] Domaine configuré et pointant vers le serveur
- [ ] Ports 80 et 443 ouverts dans le firewall
- [ ] Nginx installé et configuré
- [ ] Application Node.js fonctionnelle sur HTTP

### Configuration HTTPS
- [ ] Certificat SSL généré (Let's Encrypt ou auto-signé)
- [ ] Configuration Nginx mise à jour
- [ ] Redirection HTTP vers HTTPS configurée
- [ ] Headers de sécurité ajoutés

### Tests et Vérification
- [ ] Site accessible en HTTPS
- [ ] Redirection HTTP vers HTTPS fonctionne
- [ ] Certificat valide et non expiré
- [ ] Headers de sécurité présents
- [ ] Application fonctionnelle en HTTPS

### Monitoring
- [ ] Script de monitoring configuré
- [ ] Renouvellement automatique configuré
- [ ] Alertes d'expiration configurées

---

## 🔒 Bonnes Pratiques

1. **Utilisez Let's Encrypt** pour les certificats gratuits et automatiques
2. **Configurez HSTS** pour forcer HTTPS
3. **Utilisez TLS 1.2+** uniquement
4. **Configurez des ciphers sécurisés**
5. **Surveillez l'expiration** des certificats
6. **Testez régulièrement** la configuration SSL
7. **Utilisez Nginx** comme reverse proxy
8. **Configurez le renouvellement automatique**

---

*Guide créé le $(date) - Version 1.0*
