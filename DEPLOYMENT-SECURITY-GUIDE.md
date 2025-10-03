# 🔒 Guide de Déploiement des Corrections de Sécurité

## 📋 Vue d'ensemble

Ce guide vous accompagne pour déployer en toute sécurité les corrections critiques appliquées à votre application EB-Vision 2.0.

## 🚨 Corrections Critiques Appliquées

- ✅ **Clé JWT sécurisée** : Clé cryptographiquement forte (512 bits)
- ✅ **Credentials supprimés** : Identifiants de démo retirés du code source
- ✅ **Rate limiting activé** : Protection contre les attaques par force brute
- ✅ **Cookies httpOnly** : Stockage sécurisé des tokens (protection XSS)
- ✅ **Audit des mots de passe** : Score de sécurité amélioré à 100/100

---

## 🚀 Étapes de Déploiement

### 1. Préparation Locale

#### A. Vérification des corrections
```bash
# Exécuter le script de vérification
node scripts/security-verification-final.js

# Ou sur Windows PowerShell
.\scripts\deploy-security-fixes.ps1
```

#### B. Commit et push des changements
```bash
# Ajouter tous les fichiers modifiés
git add .

# Commit avec un message descriptif
git commit -m "🔒 Corrections critiques de sécurité

- Clé JWT cryptographiquement forte
- Credentials de démo supprimés
- Rate limiting activé
- Cookies httpOnly implémentés
- Scripts d'audit créés"

# Push vers le repository
git push origin main
```

### 2. Déploiement sur le Serveur

#### A. Connexion au serveur
```bash
# Se connecter au serveur de production
ssh user@your-server.com
cd /path/to/eb-vision-2.0
```

#### B. Mise à jour du code
```bash
# Récupérer les dernières modifications
git fetch origin

# Basculer sur la branche principale
git checkout main

# Récupérer les changements
git pull origin main

# Vérifier que les corrections sont présentes
ls -la scripts/security-*.js
ls -la src/middleware/cookieAuth.js
```

#### C. Installation des dépendances
```bash
# Installer les nouvelles dépendances (cookie-parser)
npm install

# Vérifier l'installation
npm list cookie-parser
```

#### D. Configuration de l'environnement

**⚠️ CRITIQUE : Mise à jour du fichier .env**

1. **Récupérer la nouvelle clé JWT** depuis votre environnement local :
```bash
# Sur votre machine locale
cat .env | grep JWT_SECRET
```

2. **Mettre à jour le .env sur le serveur** :
```bash
# Sur le serveur
nano .env
# ou
vim .env
```

3. **Remplacer la ligne JWT_SECRET** :
```env
# Ancien (DANGEREUX)
JWT_SECRET=dev-secret-key-2024

# Nouveau (SÉCURISÉ)
JWT_SECRET=TDjsHZSeP9YPBFrXP1jhnvZYLTDmaXsX8/cNgpNdh2wRJFNzJZQCzzT30GYYkwfkLsy5yNwnlsPuWG7eXEKQfQ==
```

#### E. Redémarrage de l'application
```bash
# Si vous utilisez PM2
pm2 restart eb-vision

# Si vous utilisez systemd
sudo systemctl restart eb-vision

# Si vous utilisez Docker
docker-compose restart

# Vérifier le statut
pm2 status
# ou
sudo systemctl status eb-vision
```

---

## 🔍 Vérification Post-Déploiement

### 1. Tests de Fonctionnalité

#### A. Test de connexion
```bash
# Tester l'API de santé
curl -I http://localhost:3000/api/health

# Tester l'authentification
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

#### B. Vérification des cookies
```bash
# Vérifier que les cookies httpOnly sont définis
curl -I -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"valid@email.com","password":"validpassword"}' \
  -c cookies.txt

# Vérifier le contenu des cookies
cat cookies.txt
```

### 2. Tests de Sécurité

#### A. Audit des mots de passe
```bash
# Exécuter l'audit de sécurité
node scripts/security-audit-passwords.js

# Vérifier que le score est > 90/100
```

#### B. Test du rate limiting
```bash
# Tester le rate limiting (doit échouer après 20 tentatives)
for i in {1..25}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrongpassword"}'
  echo "Tentative $i"
done
```

#### C. Vérification des credentials supprimés
```bash
# Vérifier que les credentials ne sont plus dans le code
grep -r "admin@ebvision.com" public/
grep -r "admin123" public/
# Ces commandes ne doivent rien retourner
```

### 3. Vérification des Logs

```bash
# Vérifier les logs d'application
pm2 logs eb-vision --lines 50

# Vérifier les logs système
sudo journalctl -u eb-vision -f

# Rechercher les erreurs de sécurité
grep -i "error\|warning\|security" /var/log/eb-vision.log
```

---

## 🚨 Gestion des Incidents

### Problèmes Courants et Solutions

#### 1. Application ne démarre pas
```bash
# Vérifier les logs d'erreur
pm2 logs eb-vision --err

# Vérifier la configuration
node -c server.js

# Vérifier les dépendances
npm audit
```

#### 2. Erreurs de cookies
```bash
# Vérifier que cookie-parser est installé
npm list cookie-parser

# Vérifier la configuration CORS
grep -A 5 "credentials: true" server.js
```

#### 3. Rate limiting trop restrictif
```bash
# Désactiver temporairement (DÉVELOPPEMENT UNIQUEMENT)
export RATE_LIMIT_BYPASS=true
pm2 restart eb-vision
```

#### 4. Problèmes d'authentification
```bash
# Vérifier la clé JWT
grep JWT_SECRET .env

# Tester la génération de token
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

---

## 📊 Monitoring de Sécurité

### 1. Surveillance Continue

#### A. Script de monitoring
```bash
# Créer un script de monitoring quotidien
cat > /opt/eb-vision/security-monitor.sh << 'EOF'
#!/bin/bash
echo "=== AUDIT DE SÉCURITÉ QUOTIDIEN ==="
echo "Date: $(date)"
echo ""

# Audit des mots de passe
cd /path/to/eb-vision-2.0
node scripts/security-audit-passwords.js

# Vérification des logs d'erreur
echo ""
echo "=== ERREURS RÉCENTES ==="
pm2 logs eb-vision --err --lines 10

# Vérification de l'état de l'application
echo ""
echo "=== ÉTAT DE L'APPLICATION ==="
pm2 status
EOF

chmod +x /opt/eb-vision/security-monitor.sh
```

#### B. Cron job pour surveillance
```bash
# Ajouter à la crontab
crontab -e

# Ajouter cette ligne pour un audit quotidien à 6h
0 6 * * * /opt/eb-vision/security-monitor.sh >> /var/log/security-audit.log 2>&1
```

### 2. Alertes de Sécurité

#### A. Configuration des alertes
```bash
# Script d'alerte en cas de problème
cat > /opt/eb-vision/security-alert.sh << 'EOF'
#!/bin/bash
# Envoyer une alerte par email en cas de problème de sécurité
echo "ALERTE SÉCURITÉ - EB-Vision 2.0" | mail -s "Alerte Sécurité" admin@yourcompany.com
EOF

chmod +x /opt/eb-vision/security-alert.sh
```

---

## ✅ Checklist de Déploiement

### Avant le Déploiement
- [ ] Toutes les corrections sont testées localement
- [ ] Les tests de sécurité passent (score > 90/100)
- [ ] Le code est commité et pushé
- [ ] La nouvelle clé JWT est prête
- [ ] Un plan de rollback est préparé

### Pendant le Déploiement
- [ ] Code mis à jour sur le serveur
- [ ] Dépendances installées
- [ ] Fichier .env mis à jour avec la nouvelle clé JWT
- [ ] Application redémarrée
- [ ] Tests de fonctionnalité effectués

### Après le Déploiement
- [ ] Connexion utilisateur fonctionne
- [ ] Cookies httpOnly sont définis
- [ ] Rate limiting est actif
- [ ] Credentials de démo ne sont plus visibles
- [ ] Audit de sécurité montre un score > 90/100
- [ ] Logs ne montrent pas d'erreurs
- [ ] Monitoring configuré

---

## 🆘 Support et Contacts

En cas de problème lors du déploiement :

1. **Vérifiez les logs** : `pm2 logs eb-vision`
2. **Consultez ce guide** : Revenez aux sections de dépannage
3. **Contactez l'équipe** : admin@yourcompany.com
4. **Rollback si nécessaire** : `git checkout previous-version`

---

## 📝 Notes Importantes

- **⚠️ CRITIQUE** : Ne jamais commiter le fichier `.env` avec la vraie clé JWT
- **🔄 REDÉMARRAGE** : L'application doit être redémarrée après chaque changement de configuration
- **📊 MONITORING** : Surveillez les logs pendant les premières heures après le déploiement
- **🔒 SÉCURITÉ** : Changez la clé JWT régulièrement en production (tous les 3-6 mois)

---

*Guide créé le $(date) - Version 1.0*
