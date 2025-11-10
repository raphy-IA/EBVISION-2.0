# 🎨 Guide de Personnalisation White-Label
## ENTERPRISE WORKFLOW MANAGEMENT - System de Branding Multi-Client

**Version** : 2.0.0  
**Dernière mise à jour** : 2 novembre 2024  
**Auteur** : EB-Vision Team

---

## 📑 Table des Matières

1. [Introduction](#introduction)
2. [Architecture du Système White-Label](#architecture)
3. [Guide de Démarrage Rapide](#demarrage-rapide)
4. [Configuration d'un Nouveau Client](#nouveau-client)
5. [Personnalisation Avancée](#personnalisation-avancee)
6. [Gestion des Thèmes](#themes)
7. [API de Branding](#api-branding)
8. [Déploiement Multi-Tenant](#deploiement)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Introduction {#introduction}

Le système white-label d'**ENTERPRISE WORKFLOW MANAGEMENT** permet de personnaliser entièrement l'application pour chaque client avec :

- ✅ **Branding personnalisé** (logos, couleurs, nom)
- ✅ **Configuration par environnement** (dev, démo, production)
- ✅ **Activation/désactivation de modules** par client
- ✅ **Multi-langues** et formats locaux
- ✅ **Mode démo** avec bannière et watermark
- ✅ **Thèmes de couleurs dynamiques**

---

## 🏗️ Architecture du Système White-Label {#architecture}

### Structure des Fichiers

```
eb-vision-2.0/
├── config/
│   ├── branding/
│   │   ├── default.json          ← Configuration par défaut (EWM)
│   │   ├── demo.json             ← Version démo publique
│   │   ├── client-example-a.json ← Exemple client A (ACME)
│   │   ├── client-example-b.json ← Exemple client B (TechVision)
│   │   └── client-template.json  ← Template pour nouveaux clients
│   └── themes/
│       └── brand-variables.css   ← Variables CSS dynamiques
├── public/
│   ├── assets/
│   │   └── brands/
│   │       ├── default/          ← Assets par défaut
│   │       ├── demo/             ← Assets démo
│   │       ├── acme/             ← Assets client A
│   │       └── techvision/       ← Assets client B
│   └── js/
│       ├── branding-loader.js    ← Loader principal
│       └── sidebar-branding.js   ← Application sidebar
├── src/
│   ├── services/
│   │   └── brandingService.js    ← Service backend
│   └── routes/
│       └── branding.js           ← Routes API
└── .env
    └── BRAND_CONFIG=demo         ← Sélection du branding actif
```

### Flux de Chargement

```
1. Page chargée
   ↓
2. branding-loader.js s'initialise
   ↓
3. Appel API: GET /api/branding/config
   ↓
4. Backend lit le fichier config/branding/${BRAND_CONFIG}.json
   ↓
5. Configuration retournée au frontend
   ↓
6. Application des couleurs (CSS variables)
   ↓
7. Application des textes (DOM manipulation)
   ↓
8. Application des logos (images)
   ↓
9. Event 'brandingLoaded' dispatché
   ↓
10. Application prête avec le branding personnalisé ✅
```

---

## 🚀 Guide de Démarrage Rapide {#demarrage-rapide}

### Étape 1 : Configurer l'Environnement

Dans votre fichier `.env`, définissez le branding actif :

```bash
# Version démo (par défaut)
BRAND_CONFIG=demo

# Ou version par défaut
BRAND_CONFIG=default

# Ou client spécifique
BRAND_CONFIG=client-example-a
```

### Étape 2 : Redémarrer le Serveur

```bash
npm restart
# ou
pm2 restart eb-vision-2.0
```

### Étape 3 : Vérifier

Ouvrez votre navigateur et accédez à l'application. Le branding correspondant devrait être appliqué automatiquement.

---

## 🎨 Configuration d'un Nouveau Client {#nouveau-client}

### Méthode 1 : Copie Manuelle du Template

1. **Dupliquer le template** :
   ```bash
   cp config/branding/client-template.json config/branding/mon-client.json
   ```

2. **Éditer la configuration** :
   ```json
   {
     "app": {
       "name": "MON CLIENT PLATFORM",
       "shortName": "MCP",
       "tagline": "Slogan de mon client",
       "description": "Description de l'application",
       "version": "2.0.0"
     },
     "branding": {
       "logo": {
         "main": "/assets/brands/mon-client/logo.svg",
         "icon": "/assets/brands/mon-client/icon.svg",
         "favicon": "/assets/brands/mon-client/favicon.ico"
       },
       "colors": {
         "primary": "#YOUR_COLOR",
         "secondary": "#YOUR_COLOR",
         "accent": "#YOUR_COLOR"
       }
     }
   }
   ```

3. **Créer le dossier des assets** :
   ```bash
   mkdir public/assets/brands/mon-client
   ```

4. **Ajouter les logos** :
   - Copier `logo.svg` (logo principal)
   - Copier `icon.svg` (icône)
   - Copier `favicon.ico` (favicon)

5. **Activer le nouveau branding** :
   ```bash
   # Dans .env
   BRAND_CONFIG=mon-client
   ```

### Méthode 2 : Via l'API (Recommandé)

```javascript
// Requête API pour créer un nouveau client
POST /api/branding/create
Headers: {
  "Authorization": "Bearer YOUR_SUPER_ADMIN_TOKEN",
  "Content-Type": "application/json"
}
Body: {
  "clientId": "mon-client",
  "config": {
    "app": {
      "name": "MON CLIENT PLATFORM",
      "shortName": "MCP"
    },
    "branding": {
      "colors": {
        "primary": "#1a4d7c",
        "secondary": "#2980b9"
      }
    }
  }
}
```

---

## ⚙️ Personnalisation Avancée {#personnalisation-avancee}

### Structure Complète du Fichier de Configuration

```json
{
  "app": {
    "name": "Nom Complet de l'Application",
    "shortName": "SIGLE",
    "tagline": "Votre slogan",
    "description": "Description détaillée",
    "version": "2.0.0"
  },
  "branding": {
    "logo": {
      "main": "/assets/brands/client/logo.svg",
      "icon": "/assets/brands/client/icon.svg",
      "favicon": "/assets/brands/client/favicon.ico"
    },
    "colors": {
      "primary": "#2c3e50",      // Couleur principale (sidebar, boutons)
      "secondary": "#3498db",    // Couleur secondaire
      "accent": "#27ae60",       // Couleur d'accentuation
      "success": "#27ae60",      // Vert de succès
      "warning": "#f39c12",      // Orange d'avertissement
      "danger": "#e74c3c",       // Rouge de danger
      "info": "#3498db",         // Bleu d'information
      "dark": "#1a252f",         // Couleur sombre
      "light": "#ecf0f1"         // Couleur claire
    },
    "theme": "custom"
  },
  "ui": {
    "sidebarTitle": "TITRE SIDEBAR",
    "sidebarSubtitle": "Sous-titre sidebar",
    "loginTitle": "Bienvenue",
    "loginSubtitle": "Connectez-vous",
    "footer": {
      "text": "Nom entreprise",
      "copyright": "© 2024 Votre Entreprise"
    }
  },
  "features": {
    "dashboard": true,           // Activer/désactiver les dashboards
    "reports": true,
    "timeManagement": true,
    "missionManagement": true,
    "marketPipeline": true,
    "hrManagement": true,
    "configurations": true,
    "businessUnits": true,
    "administration": true
  },
  "modules": {
    "dashboard": {
      "enabled": true,
      "displayName": "Tableau de Bord"  // Nom personnalisé du module
    }
    // ... autres modules
  },
  "contact": {
    "email": "support@client.com",
    "phone": "+XX X XX XX XX XX",
    "website": "https://client.com",
    "supportUrl": "https://support.client.com"
  },
  "localization": {
    "defaultLanguage": "fr",
    "availableLanguages": ["fr", "en"],
    "dateFormat": "DD/MM/YYYY",
    "timeFormat": "HH:mm",
    "currency": "EUR",
    "currencySymbol": "€"
  },
  "demo": {
    "mode": false,              // Mode démo activé ?
    "bannerText": "",           // Texte de la bannière démo
    "watermark": false,         // Watermark "DEMO" en fond ?
    "sampleData": false,        // Données de test ?
    "restrictedFeatures": []    // Fonctionnalités à désactiver en mode démo
  }
}
```

### Personnalisation des Couleurs

Les couleurs sont appliquées via des **CSS variables** pour une application en temps réel :

```css
:root {
    --brand-primary: #YOUR_COLOR;
    --brand-secondary: #YOUR_COLOR;
    /* ... */
}
```

**Choisir vos couleurs** :

1. **Couleur primaire** : Couleur dominante (sidebar, boutons principaux)
2. **Couleur secondaire** : Couleur d'appui (liens, boutons secondaires)
3. **Couleur d'accent** : Mise en avant (badges, highlights)

**Outils recommandés** :
- [Coolors.co](https://coolors.co) - Générateur de palettes
- [Adobe Color](https://color.adobe.com) - Roue chromatique
- [Material Design Colors](https://materialui.co/colors) - Palettes Material

---

## 🎨 Gestion des Thèmes {#themes}

### Thèmes Prédéfinis

L'application inclut plusieurs thèmes :

| Thème | Description | Couleurs |
|-------|-------------|----------|
| `default` | Thème par défaut EWM | Bleu marine / Bleu ciel |
| `demo` | Thème démo neutre | Gris bleuté / Bleu clair |
| `acme` | Exemple ACME Corp | Bleu foncé / Vert |
| `techvision` | Exemple TechVision | Violet / Vert menthe |

### Créer un Thème Personnalisé

1. **Définir les couleurs dans la config** :
```json
{
  "branding": {
    "colors": {
      "primary": "#6c5ce7",
      "secondary": "#a29bfe",
      "accent": "#00b894"
    },
    "theme": "mon-theme-custom"
  }
}
```

2. **Les couleurs sont appliquées automatiquement** via le `branding-loader.js`

3. **Variantes automatiques** :
   - Le système génère automatiquement des variantes claires et sombres
   - `--brand-primary-light` (20% plus clair)
   - `--brand-primary-dark` (20% plus sombre)

---

## 🔌 API de Branding {#api-branding}

### Endpoints Disponibles

#### 1. Obtenir la Configuration Active

```http
GET /api/branding/config
```

**Réponse** :
```json
{
  "success": true,
  "data": {
    "app": { ... },
    "branding": { ... },
    "ui": { ... }
  }
}
```

**Public** : ✅ Pas d'authentification requise (pour la page de login)

#### 2. Obtenir une Configuration Spécifique

```http
GET /api/branding/config/:brandId
Authorization: Bearer TOKEN
```

**Exemple** :
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/branding/config/demo
```

#### 3. Lister Tous les Brandings

```http
GET /api/branding/list
Authorization: Bearer TOKEN (ADMIN)
```

**Réponse** :
```json
{
  "success": true,
  "data": ["default", "demo", "client-a", "client-b"]
}
```

#### 4. Changer le Branding Actif

```http
POST /api/branding/set/:brandId
Authorization: Bearer TOKEN (SUPER_ADMIN)
```

**Exemple** :
```bash
curl -X POST \
     -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
     http://localhost:3000/api/branding/set/client-a
```

#### 5. Créer un Nouveau Branding

```http
POST /api/branding/create
Authorization: Bearer TOKEN (SUPER_ADMIN)
Content-Type: application/json

{
  "clientId": "nouveau-client",
  "config": { ... }
}
```

#### 6. Invalider le Cache

```http
DELETE /api/branding/cache/:brandId?
Authorization: Bearer TOKEN (ADMIN)
```

---

## 🚀 Déploiement Multi-Tenant {#deploiement}

### Scénario 1 : Un serveur par client

Chaque client a son propre serveur avec sa configuration :

```bash
# Serveur client A
BRAND_CONFIG=client-a
PORT=3000

# Serveur client B
BRAND_CONFIG=client-b
PORT=3001
```

### Scénario 2 : Un serveur, multi-domaines

Utiliser le domaine pour déterminer le branding :

```javascript
// Ajout dans server.js
app.use((req, res, next) => {
  const hostname = req.hostname;
  
  const domainBrandMap = {
    'acme.example.com': 'client-a',
    'techvision.example.com': 'client-b',
    'demo.example.com': 'demo'
  };
  
  req.brandId = domainBrandMap[hostname] || 'default';
  next();
});
```

### Scénario 3 : Version démo publique

Pour la démo publique :

1. **Configurer le mode démo** :
```bash
BRAND_CONFIG=demo
```

2. **Activer le watermark et la bannière** dans `demo.json` :
```json
{
  "demo": {
    "mode": true,
    "bannerText": "🎯 DEMO VERSION - Discover all features",
    "watermark": true,
    "sampleData": true
  }
}
```

3. **Ajouter des restrictions** (optionnel) :
```json
{
  "demo": {
    "restrictedFeatures": [
      "delete_user",
      "export_data",
      "send_email"
    ]
  }
}
```

---

## 🎯 Exemples Pratiques

### Exemple 1 : ACME Corporation

**Fichier** : `config/branding/acme.json`

```json
{
  "app": {
    "name": "ACME BUSINESS SUITE",
    "shortName": "ACME"
  },
  "branding": {
    "colors": {
      "primary": "#1a4d7c",
      "secondary": "#2980b9",
      "accent": "#16a085"
    }
  }
}
```

**Activation** :
```bash
BRAND_CONFIG=acme
```

**Résultat** : Application complètement personnalisée avec les couleurs et le nom ACME.

### Exemple 2 : TechVision Solutions

**Fichier** : `config/branding/techvision.json`

```json
{
  "app": {
    "name": "TECHVISION WORKSPACE",
    "shortName": "TECHVISION"
  },
  "branding": {
    "colors": {
      "primary": "#6c5ce7",
      "secondary": "#a29bfe",
      "accent": "#00b894"
    }
  }
}
```

---

## 🐛 Troubleshooting {#troubleshooting}

### Problème : Le branding ne se charge pas

**Solution** :
1. Vérifier que le fichier `config/branding/${BRAND_CONFIG}.json` existe
2. Vérifier la console du navigateur pour les erreurs
3. Vider le cache : `localStorage.removeItem('brandingConfig')`
4. Recharger la page avec Ctrl+F5

### Problème : Les couleurs ne s'appliquent pas

**Solution** :
1. Vérifier que `brand-variables.css` est bien chargé
2. Ouvrir les DevTools > Elements > `:root` pour voir les variables CSS
3. S'assurer que les couleurs sont au format hexadécimal (#RRGGBB)

### Problème : Les logos ne s'affichent pas

**Solution** :
1. Vérifier que les fichiers existent dans `/public/assets/brands/[client]/`
2. Vérifier les chemins dans la configuration JSON
3. Vérifier les permissions de fichiers

### Problème : Erreur 404 sur /api/branding/config

**Solution** :
1. Vérifier que la route est bien ajoutée dans `server.js`
2. Redémarrer le serveur
3. Vérifier les logs serveur

---

## 📞 Support

Pour toute question ou problème :

- **Documentation** : Ce fichier
- **Exemples** : Voir les fichiers dans `config/branding/`
- **Code source** : `src/services/brandingService.js`

---

**© 2024 ENTERPRISE WORKFLOW MANAGEMENT - White-Label System**










