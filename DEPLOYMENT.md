# Déploiement EB-Vision 2.0 sur PlanetHoster N0C

## 📋 Prérequis

1. **Compte PlanetHoster N0C** avec Node.js activé
2. **Base de données PostgreSQL** configurée
3. **Domaine** pointant vers votre hébergement

## 🚀 Installation

### 1. Upload des fichiers
- Uploadez tous les fichiers du projet dans le dossier racine de votre hébergement
- Assurez-vous que le fichier `.htaccess` est bien présent

### 2. Configuration de la base de données
Modifiez le fichier `config.production.js` avec vos informations de base de données :

```javascript
database: {
  host: 'votre_host_postgresql',
  port: 5432,
  database: 'votre_nom_base',
  user: 'votre_utilisateur',
  password: 'votre_mot_de_passe'
}
```

### 3. Variables d'environnement
Créez un fichier `.env` à la racine avec :

```
NODE_ENV=production
PORT=3000
DB_HOST=votre_host_postgresql
DB_PORT=5432
DB_NAME=votre_nom_base
DB_USER=votre_utilisateur
DB_PASSWORD=votre_mot_de_passe
JWT_SECRET=votre_secret_jwt_super_securise
APP_URL=https://votre-domaine.com
```

### 4. Installation de Node.js (si nécessaire)

Si Node.js n'est pas installé sur votre serveur, vous devez d'abord l'installer :

#### Option A : Avec privilèges sudo
```bash
# Rendre le script exécutable
chmod +x install-nodejs.sh

# Installer Node.js
./install-nodejs.sh
```

#### Option B : Sans privilèges sudo (recommandé pour PlanetHoster)
```bash
# Rendre le script exécutable
chmod +x install-nodejs-nvm.sh

# Installer Node.js via NVM
./install-nodejs-nvm.sh

# Recharger le shell pour activer NVM
source ~/.bashrc
```

### 5. Vérification des prérequis
```bash
# Rendre le script exécutable
chmod +x check-prerequisites.sh

# Vérifier que tout est prêt
./check-prerequisites.sh
```

### 6. Installation et démarrage de l'application
```bash
# Rendre le script exécutable
chmod +x install.sh

# Exécuter l'installation
./install.sh
```

## 🔧 Commandes utiles

```bash
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
```

## 📊 Monitoring

- **PM2 Dashboard** : `pm2 monit`
- **Logs en temps réel** : `pm2 logs eb-vision-2.0`
- **Statut de l'application** : `pm2 status`

## 🔒 Sécurité

1. **Changez le JWT_SECRET** en production
2. **Utilisez HTTPS** (configuré dans .htaccess)
3. **Limitez les accès** à la base de données
4. **Surveillez les logs** régulièrement

## 🆘 Dépannage

### L'application ne démarre pas
```bash
# Vérifier les logs
pm2 logs eb-vision-2.0

# Vérifier la configuration
pm2 show eb-vision-2.0
```

### Problème de base de données
- Vérifiez les informations de connexion dans `config.production.js`
- Testez la connexion : `node -e "require('./src/utils/database')"`

### Problème de permissions
```bash
chmod 755 public/
chmod 644 .htaccess
chmod +x install.sh
```
