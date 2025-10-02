const fs = require('fs');
const path = require('path');

console.log('🚀 Préparation du déploiement pour PlanetHoster N0C...\n');

// 1. Créer le fichier .htaccess pour la redirection
const htaccessContent = `
RewriteEngine On

# Redirection de HTTP vers HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Redirection des requêtes API vers Node.js
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^api/(.*)$ http://localhost:3000/api/$1 [P,L]

# Redirection des fichiers statiques
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /public/$1 [L]

# Headers de sécurité
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"
Header always set Referrer-Policy "strict-origin-when-cross-origin"

# Cache pour les fichiers statiques
<FilesMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 year"
    Header set Cache-Control "public, immutable"
</FilesMatch>
`;

fs.writeFileSync('.htaccess', htaccessContent);
console.log('✅ Fichier .htaccess créé');

// 2. Créer le fichier package.json optimisé pour la production
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Ajouter les scripts de production
packageJson.scripts = {
  ...packageJson.scripts,
  "start:prod": "NODE_ENV=production node server.js",
  "pm2:start": "pm2 start ecosystem.config.js --env production",
  "pm2:stop": "pm2 stop eb-vision-2.0",
  "pm2:restart": "pm2 restart eb-vision-2.0",
  "pm2:logs": "pm2 logs eb-vision-2.0",
  "pm2:monit": "pm2 monit"
};

// Ajouter PM2 comme dépendance de production
if (!packageJson.dependencies) packageJson.dependencies = {};
packageJson.dependencies.pm2 = "^5.3.0";

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
console.log('✅ package.json mis à jour avec les scripts de production');

// 3. Créer un fichier de configuration PM2 spécifique
const pm2Config = `
module.exports = {
  apps: [{
    name: 'eb-vision-2.0',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
`;

// Créer le dossier logs s'il n'existe pas
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

fs.writeFileSync('ecosystem.config.js', pm2Config);
console.log('✅ Configuration PM2 créée');

// 4. Créer un script d'installation
const installScript = `#!/bin/bash
echo "🔧 Installation des dépendances..."
npm install --production

echo "📦 Installation de PM2..."
npm install -g pm2

echo "🗄️ Création des dossiers nécessaires..."
mkdir -p logs
mkdir -p uploads

echo "🔐 Configuration des permissions..."
chmod 755 public/
chmod 644 .htaccess

echo "🚀 Démarrage de l'application..."
pm2 start ecosystem.config.js --env production

echo "✅ Installation terminée !"
echo "📊 Pour surveiller l'application: pm2 monit"
echo "📝 Pour voir les logs: pm2 logs eb-vision-2.0"
`;

fs.writeFileSync('install.sh', installScript);
console.log('✅ Script d\'installation créé');

// 5. Créer un fichier README pour le déploiement
const readmeContent = `# Déploiement EB-Vision 2.0 sur PlanetHoster N0C

## 📋 Prérequis

1. **Compte PlanetHoster N0C** avec Node.js activé
2. **Base de données PostgreSQL** configurée
3. **Domaine** pointant vers votre hébergement

## 🚀 Installation

### 1. Upload des fichiers
- Uploadez tous les fichiers du projet dans le dossier racine de votre hébergement
- Assurez-vous que le fichier \`.htaccess\` est bien présent

### 2. Configuration de la base de données
Modifiez le fichier \`config.production.js\` avec vos informations de base de données :

\`\`\`javascript
database: {
  host: 'votre_host_postgresql',
  port: 5432,
  database: 'votre_nom_base',
  user: 'votre_utilisateur',
  password: 'votre_mot_de_passe'
}
\`\`\`

### 3. Variables d'environnement
Créez un fichier \`.env\` à la racine avec :

\`\`\`
NODE_ENV=production
PORT=3000
DB_HOST=votre_host_postgresql
DB_PORT=5432
DB_NAME=votre_nom_base
DB_USER=votre_utilisateur
DB_PASSWORD=votre_mot_de_passe
JWT_SECRET=votre_secret_jwt_super_securise
APP_URL=https://votre-domaine.com
\`\`\`

### 4. Installation et démarrage
\`\`\`bash
# Rendre le script exécutable
chmod +x install.sh

# Exécuter l'installation
./install.sh
\`\`\`

## 🔧 Commandes utiles

\`\`\`bash
# Démarrer l'application
npm run pm2:start

# Arrêter l'application
npm run pm2:stop

# Redémarrer l'application
npm run pm2:restart

# Voir les logs
npm run pm2:logs

# Surveiller l'application
npm run pm2:monit
\`\`\`

## 📊 Monitoring

- **PM2 Dashboard** : \`pm2 monit\`
- **Logs en temps réel** : \`pm2 logs eb-vision-2.0\`
- **Statut de l'application** : \`pm2 status\`

## 🔒 Sécurité

1. **Changez le JWT_SECRET** en production
2. **Utilisez HTTPS** (configuré dans .htaccess)
3. **Limitez les accès** à la base de données
4. **Surveillez les logs** régulièrement

## 🆘 Dépannage

### L'application ne démarre pas
\`\`\`bash
# Vérifier les logs
pm2 logs eb-vision-2.0

# Vérifier la configuration
pm2 show eb-vision-2.0
\`\`\`

### Problème de base de données
- Vérifiez les informations de connexion dans \`config.production.js\`
- Testez la connexion : \`node -e "require('./src/utils/database')"\`

### Problème de permissions
\`\`\`bash
chmod 755 public/
chmod 644 .htaccess
chmod +x install.sh
\`\`\`
`;

fs.writeFileSync('DEPLOYMENT.md', readmeContent);
console.log('✅ Documentation de déploiement créée');

console.log('\n🎉 Préparation terminée !');
console.log('\n📋 Fichiers créés :');
console.log('   - .htaccess (redirection et sécurité)');
console.log('   - ecosystem.config.js (configuration PM2)');
console.log('   - install.sh (script d\'installation)');
console.log('   - DEPLOYMENT.md (documentation complète)');
console.log('\n🚀 Prochaines étapes :');
console.log('   1. Uploadez tous les fichiers sur PlanetHoster');
console.log('   2. Configurez votre base de données PostgreSQL');
console.log('   3. Modifiez config.production.js avec vos informations');
console.log('   4. Exécutez ./install.sh');










