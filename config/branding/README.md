# 📁 Configuration Branding White-Label

## Structure des Fichiers

Ce dossier contient les configurations de branding pour chaque client ou environnement.

---

## 📋 Fichiers Disponibles

### 🎯 Configurations Prêtes

| Fichier | Description | Usage |
|---------|-------------|-------|
| `default.json` | Configuration par défaut (EWM) | Production standard |
| `demo.json` | Version démo avec bannière | Présentations clients |
| `client-example-a.json` | Exemple ACME Corporation | Exemple de personnalisation |
| `client-example-b.json` | Exemple TechVision Solutions | Exemple moderne |
| `client-template.json` | Template pour nouveaux clients | À copier et personnaliser |

---

## 🚀 Utilisation

### Sélectionner une Configuration

Dans le fichier `.env` à la racine du projet :

```bash
# Version démo
BRAND_CONFIG=demo

# Version par défaut
BRAND_CONFIG=default

# Client spécifique
BRAND_CONFIG=client-example-a
```

### Créer une Nouvelle Configuration Client

```bash
# 1. Copier le template
cp client-template.json mon-client.json

# 2. Éditer mon-client.json avec les informations du client

# 3. Dans .env
BRAND_CONFIG=mon-client

# 4. Redémarrer le serveur
npm restart
```

---

## 📊 Structure d'un Fichier de Configuration

### Sections Principales

```json
{
  "app": {
    // Informations de l'application
  },
  "branding": {
    // Logos et couleurs
  },
  "ui": {
    // Textes de l'interface
  },
  "features": {
    // Activation/désactivation des fonctionnalités
  },
  "modules": {
    // Noms personnalisés des modules
  },
  "contact": {
    // Informations de contact
  },
  "localization": {
    // Langue, format date, devise
  },
  "demo": {
    // Mode démo et restrictions
  }
}
```

---

## 🎨 Personnalisation des Couleurs

### Couleurs Disponibles

```json
{
  "branding": {
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
    }
  }
}
```

### Exemples de Palettes

#### Professionnel Classique
```json
{
  "primary": "#2c3e50",
  "secondary": "#3498db",
  "accent": "#27ae60"
}
```

#### Moderne & Tech
```json
{
  "primary": "#6c5ce7",
  "secondary": "#a29bfe",
  "accent": "#00b894"
}
```

#### Corporate & Sérieux
```json
{
  "primary": "#1a4d7c",
  "secondary": "#2980b9",
  "accent": "#16a085"
}
```

---

## 🖼️ Gestion des Logos

### Structure des Assets

```
public/assets/brands/
├── [client-id]/
│   ├── logo.svg      (Logo principal - affiché dans la sidebar)
│   ├── icon.svg      (Icône - 64x64px recommandé)
│   └── favicon.ico   (Favicon - 32x32px ou 16x16px)
```

### Dans la Configuration

```json
{
  "branding": {
    "logo": {
      "main": "/assets/brands/mon-client/logo.svg",
      "icon": "/assets/brands/mon-client/icon.svg",
      "favicon": "/assets/brands/mon-client/favicon.ico"
    }
  }
}
```

**Note** : Si les fichiers n'existent pas, l'icône par défaut (Font Awesome) sera utilisée.

---

## 🌍 Localisation

```json
{
  "localization": {
    "defaultLanguage": "fr",              // Langue par défaut
    "availableLanguages": ["fr", "en"],   // Langues disponibles
    "dateFormat": "DD/MM/YYYY",           // Format de date
    "timeFormat": "HH:mm",                // Format d'heure
    "currency": "EUR",                    // Code devise ISO
    "currencySymbol": "€"                 // Symbole monétaire
  }
}
```

---

## 🎯 Mode Démo

Pour activer le mode démo (bannière, watermark, etc.) :

```json
{
  "demo": {
    "mode": true,                           // Activer le mode démo
    "bannerText": "🎯 DEMO VERSION",       // Texte de la bannière
    "watermark": true,                      // Afficher "DEMO" en arrière-plan
    "sampleData": true,                     // Charger des données de test
    "restrictedFeatures": [                 // Fonctionnalités à désactiver
      "delete_user",
      "export_sensitive_data"
    ]
  }
}
```

---

## ✅ Validation

### Champs Obligatoires

Ces champs sont **requis** dans chaque configuration :

- `app.name` - Nom de l'application
- `app.shortName` - Sigle/acronyme
- `branding.colors.primary` - Couleur principale
- `ui.sidebarTitle` - Titre de la sidebar

### Validation Automatique

Le backend valide automatiquement les configurations au chargement. En cas d'erreur, la configuration par défaut (`default.json`) sera utilisée.

---

## 🔄 Rechargement

### Cache

Les configurations sont mises en cache pendant **10 minutes** pour améliorer les performances.

### Invalider le Cache

```bash
# Via l'API (nécessite authentification ADMIN)
curl -X DELETE http://localhost:3000/api/branding/cache \
  -H "Authorization: Bearer YOUR_TOKEN"

# Ou redémarrer le serveur
npm restart
```

---

## 📖 Documentation Complète

Pour plus de détails, consultez :

- **[Guide White-Label Complet](../../docs/WHITE-LABEL-GUIDE.md)**
- **[Quick Start](../../docs/QUICK-START-WHITE-LABEL.md)**
- **[Guide d'Activation](../../COMMENT-ACTIVER-WHITE-LABEL.md)**

---

## 💡 Exemples d'Utilisation

### Exemple 1 : Client Audit & Comptabilité

```json
{
  "app": {
    "name": "CABINET EXCELLENCE AUDIT",
    "shortName": "CEA"
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

### Exemple 2 : Startup Tech

```json
{
  "app": {
    "name": "STARTUP ACCELERATOR PLATFORM",
    "shortName": "SAP"
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

### Exemple 3 : Grande Entreprise

```json
{
  "app": {
    "name": "GLOBAL ENTERPRISE SUITE",
    "shortName": "GES"
  },
  "branding": {
    "colors": {
      "primary": "#0f2d47",
      "secondary": "#2c3e50",
      "accent": "#95a5a6"
    }
  }
}
```

---

## 🛠️ Outils Recommandés

### Générateurs de Palettes
- **Coolors** : https://coolors.co
- **Adobe Color** : https://color.adobe.com
- **Material Design Colors** : https://materialui.co/colors

### Éditeurs JSON
- **Visual Studio Code** (avec extension JSON)
- **JSONLint** : https://jsonlint.com (validation en ligne)

### Création de Logos
- **Canva** : https://canva.com
- **Figma** : https://figma.com
- **Inkscape** : https://inkscape.org (gratuit, SVG)

---

## 🐛 Dépannage

### Configuration non chargée ?

1. Vérifier que le fichier existe
2. Vérifier que le nom dans `.env` correspond au nom du fichier
3. Vérifier la syntaxe JSON (pas d'erreur)
4. Redémarrer le serveur

### Couleurs non appliquées ?

1. Vérifier que les couleurs sont au format hexadécimal (`#RRGGBB`)
2. Vider le cache navigateur
3. Vérifier la console navigateur (F12) pour les erreurs

### Logos non affichés ?

1. Vérifier que les fichiers existent dans `public/assets/brands/[client-id]/`
2. Vérifier les chemins dans la configuration
3. Vérifier les permissions de fichiers

---

**Pour toute question, consultez la [documentation complète](../../docs/WHITE-LABEL-GUIDE.md) 📖**












