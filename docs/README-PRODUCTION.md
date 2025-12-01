# EB-Vision 2.0 - Production

## 🚀 Déploiement

Cette version est optimisée pour la production. Tous les fichiers de développement et de test ont été déplacés dans le dossier `development-scripts/`.

## 📁 Structure de production

```
eb-vision-2.0/
├── public/                 # Fichiers statiques
├── src/                   # Code source de l'application
├── scripts/               # Scripts de production uniquement
│   ├── migrate-production.js
│   └── deploy-planethoster.js
├── .htaccess              # Configuration Apache
├── ecosystem.config.js    # Configuration PM2
├── install.sh             # Script d'installation
├── DEPLOYMENT.md          # Documentation de déploiement
└── package.json           # Dépendances
```

## 🔧 Installation

1. Uploadez tous les fichiers sur votre serveur
2. Configurez votre base de données PostgreSQL
3. Modifiez `config.production.js` avec vos informations
4. Exécutez: `chmod +x install.sh && ./install.sh`

## 📊 Monitoring

- `pm2 monit` - Surveiller l'application
- `pm2 logs eb-vision-2.0` - Voir les logs
- `pm2 restart eb-vision-2.0` - Redémarrer

## 🔒 Sécurité

- Changez le JWT_SECRET en production
- Utilisez HTTPS
- Limitez les accès à la base de données
- Surveillez les logs régulièrement

## 📞 Support

Pour les problèmes de développement, consultez le dossier `development-scripts/`.
