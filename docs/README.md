# ENTERPRISE WORKFLOW MANAGEMENT (EWM)
## Anciennement EB-Vision 2.0

## 🚀 Solution White-Label de Gestion d'Entreprise

ENTERPRISE WORKFLOW MANAGEMENT est une application complète et personnalisable de gestion d'entreprise incluant :
- Gestion des opportunités commerciales
- Campagnes de prospection
- Gestion des missions et projets
- Système de permissions avancé
- Gestion des Business Units
- Feuilles de temps et facturation
- Interface moderne et responsive

## 📁 Structure du projet

```
ewm-platform/
├── config/
│   ├── branding/          # Configurations white-label par client
│   └── themes/            # Thèmes de couleurs CSS
├── public/                # Interface utilisateur
│   ├── assets/brands/     # Logos et assets par client
│   └── js/                # Scripts frontend
├── src/                   # Code source backend
│   ├── services/          # Services métier (dont brandingService)
│   └── routes/            # Routes API
├── docs/                  # Documentation complète
│   ├── WHITE-LABEL-GUIDE.md
│   └── QUICK-START-WHITE-LABEL.md
├── migrations/            # Migrations de base de données
├── scripts/               # Scripts utilitaires
└── server.js              # Point d'entrée
```

## 🎨 Système White-Label

**Nouveau !** L'application supporte désormais la personnalisation complète pour chaque client :

- 🎨 **Branding personnalisé** (logos, couleurs, nom d'application)
- 🌍 **Multi-tenant** avec configuration par client
- 🎯 **Mode démo** pour les présentations
- 📱 **Responsive** et moderne

### Démarrage Rapide

```bash
# Choisir votre branding dans .env
BRAND_CONFIG=demo          # Version démo
BRAND_CONFIG=default       # Version par défaut
BRAND_CONFIG=eb-vision-2   # Votre client original
BRAND_CONFIG=mon-client    # Client spécifique

npm start
```

### Documentation Complète

**➡️ [Documentation Branding Complète](docs/Branding/README.md)** - Tout est organisé ici !

**⚡ Démarrage ultra-rapide** :
- 🚀 [START-HERE.md](docs/Branding/START-HERE.md) - 30 secondes pour démarrer
- ⚡ [Référence Rapide](docs/Branding/REFERENCE-RAPIDE.md) - Commandes essentielles

**Guides rapides** :
- 🎯 [Lisez-Moi en Premier](docs/Branding/Guides/LISEZ-MOI-EN-PREMIER.md) - Démarrage immédiat
- 🚨 [Guide Urgent](docs/Branding/Guides/GUIDE-DEMARRAGE-URGENT.md) - Problèmes et solutions
- 📘 [Guide Complet](docs/Branding/Guides/COMMENT-ACTIVER-WHITE-LABEL.md) - Tout comprendre

**Documentation technique** :
- 📖 [White-Label Guide](docs/WHITE-LABEL-GUIDE.md) - 900+ lignes
- ⚡ [Quick Start](docs/QUICK-START-WHITE-LABEL.md) - 5 minutes
- 📊 [Index Complet](INDEX-BRANDING.md) - Navigation

## 🔧 Installation rapide

1. **Clonez** le repository
2. **Installez** les dépendances : `npm install`
3. **Configurez** votre base de données PostgreSQL
4. **Copiez** `env.example` vers `.env` et configurez
5. **Choisissez** votre branding dans `.env`
6. **Démarrez** : `npm start`

## 📋 Documentation

- **DEPLOYMENT.md** - Guide complet de déploiement
- **README-PRODUCTION.md** - Documentation de production
- **PRODUCTION-CHECKLIST.md** - Checklist de vérification
- **PRODUCTION-SUMMARY.md** - Résumé de l'organisation

## 🔒 Sécurité

- Système de permissions granulaire
- Authentification JWT sécurisée
- Authentification 2FA (optionnelle)
- Filtrage par Business Unit
- Validation des données
- Rate limiting anti-brute force

## ✨ Fonctionnalités Clés

### Personnalisation White-Label
- Configuration par client (JSON)
- Thèmes de couleurs dynamiques
- Logos et favicons personnalisables
- Textes et labels personnalisables
- Mode démo avec watermark

### Modules Métier
- **Dashboard** : 7 dashboards spécialisés
- **Rapports** : Génération de rapports avancés
- **Temps** : Gestion et validation des temps
- **Missions** : Gestion de projets et facturation
- **Pipeline** : CRM et suivi des opportunités
- **RH** : Gestion des collaborateurs
- **Administration** : Permissions et configurations

## 📞 Support

Pour les problèmes de développement, consultez le dossier `development-scripts/`.

---

**Version** : 2.0  
**Statut** : Production Ready  
**Dernière mise à jour** : 2024
