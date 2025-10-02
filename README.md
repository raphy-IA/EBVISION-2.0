# EB-Vision 2.0 - Application de Gestion d'Entreprise

## 🚀 Application de production prête pour le déploiement

EB-Vision 2.0 est une application complète de gestion d'entreprise incluant :
- Gestion des opportunités commerciales
- Campagnes de prospection
- Gestion des missions et projets
- Système de permissions avancé
- Gestion des Business Units
- Feuilles de temps et facturation
- Interface moderne et responsive

## 📁 Structure de production

```
eb-vision-2.0/
├── public/                 # Interface utilisateur
├── src/                   # Code source de l'application
├── scripts/               # Scripts de production
├── migrations/            # Migrations de base de données
├── docs/                  # Documentation
├── .htaccess              # Configuration Apache
├── ecosystem.config.js    # Configuration PM2
├── config.production.js   # Configuration de production
├── install.sh             # Script d'installation
├── DEPLOYMENT.md          # Guide de déploiement
├── package.json           # Dépendances
└── server.js              # Point d'entrée
```

## 🔧 Installation rapide

1. **Uploadez** tous les fichiers sur votre serveur
2. **Configurez** votre base de données PostgreSQL
3. **Modifiez** `config.production.js` avec vos informations
4. **Exécutez** : `chmod +x install.sh && ./install.sh`

## 📋 Documentation

- **DEPLOYMENT.md** - Guide complet de déploiement
- **README-PRODUCTION.md** - Documentation de production
- **PRODUCTION-CHECKLIST.md** - Checklist de vérification
- **PRODUCTION-SUMMARY.md** - Résumé de l'organisation

## 🔒 Sécurité

- Système de permissions granulaire
- Authentification JWT sécurisée
- Filtrage par Business Unit
- Validation des données

## 📞 Support

Pour les problèmes de développement, consultez le dossier `development-scripts/`.

---

**Version** : 2.0  
**Statut** : Production Ready  
**Dernière mise à jour** : 2024
