# ⚡ RÉFÉRENCE RAPIDE - Branding White-Label

## 🚀 COMMANDES RAPIDES

### Démarrer l'Application

**Automatique** (Recommandé) :
```batch
docs\Branding\Scripts\DEMARRER-EB-VISION.bat
```

**Manuel** :
```bash
# 1. Configurer .env
BRAND_CONFIG=eb-vision-2

# 2. Redémarrer
npm restart

# 3. Ouvrir navigateur
start http://localhost:3000

# 4. Vider cache
Ctrl + Shift + R
```

---

### Tester la Configuration

```powershell
.\docs\Branding\Scripts\TEST-BRANDING-RAPIDE.ps1
```

---

### Changer de Configuration

**Dans `.env`** :
```bash
# Client original
BRAND_CONFIG=eb-vision-2

# Version démo
BRAND_CONFIG=demo

# Version par défaut
BRAND_CONFIG=default

# Client personnalisé
BRAND_CONFIG=mon-client
```

**Puis redémarrer** :
```bash
npm restart
```

---

## 📁 CONFIGURATIONS DISPONIBLES

| ID | Nom | Fichier | Usage |
|----|-----|---------|-------|
| `eb-vision-2` | EB-VISION 2.0 | `config/branding/eb-vision-2.json` | Client original |
| `demo` | EWM DEMO | `config/branding/demo.json` | Démo avec bannière |
| `default` | EWM | `config/branding/default.json` | Version neutre |
| `client-example-a` | ACME | `config/branding/client-example-a.json` | Exemple A |
| `client-example-b` | TECHVISION | `config/branding/client-example-b.json` | Exemple B |

---

## 🎨 CRÉER UNE CONFIGURATION

### 1. Copier le Template

```bash
cp config/branding/client-template.json config/branding/nouveau-client.json
```

### 2. Personnaliser

```json
{
  "id": "nouveau-client",
  "name": "NOM ENTREPRISE",
  "tagline": "Slogan",
  "colors": {
    "primary": "#123456",
    "secondary": "#789abc"
  }
}
```

### 3. Activer

```bash
# Dans .env
BRAND_CONFIG=nouveau-client
```

### 4. Redémarrer

```bash
npm restart
```

---

## 🔧 PROBLÈMES COURANTS

### "EWM" s'affiche toujours

**Solution** :
```bash
# 1. Vérifier .env
cat .env | grep BRAND_CONFIG

# 2. Redémarrer serveur
npm restart

# 3. Vider cache navigateur
Ctrl + Shift + R
```

---

### Erreur 404 /api/branding/config

**Solution** :
```bash
# Redémarrer le serveur
npm restart
```

---

### Les couleurs ne changent pas

**Solution** :
```bash
# Vider le cache navigateur
Ctrl + Shift + R
# Ou
Ctrl + F5
```

---

### Le serveur ne démarre pas

**Solution** :
```bash
# 1. Arrêter tous les processus Node
taskkill /F /IM node.exe

# 2. Redémarrer
npm start
```

---

## 📊 API BRANDING

### Endpoint Principal

```
GET /api/branding/config
```

**Réponse** :
```json
{
  "id": "eb-vision-2",
  "name": "EB-VISION 2.0",
  "tagline": "Solution Complète de Gestion d'Entreprise",
  "colors": {
    "primary": "#2c3e50",
    "secondary": "#3498db"
  }
}
```

### Test avec curl

```bash
curl http://localhost:3000/api/branding/config
```

### Test avec PowerShell

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/branding/config"
```

---

## 🎨 PALETTE DE COULEURS

### EB-Vision 2.0 (Original)

```css
Primary:   #2c3e50  /* Bleu foncé */
Secondary: #3498db  /* Bleu clair */
Success:   #27ae60  /* Vert */
Danger:    #e74c3c  /* Rouge */
Warning:   #f39c12  /* Orange */
Info:      #3498db  /* Bleu */
```

### EWM Default (Neutre)

```css
Primary:   #6c757d  /* Gris */
Secondary: #adb5bd  /* Gris clair */
Success:   #28a745  /* Vert */
Danger:    #dc3545  /* Rouge */
Warning:   #ffc107  /* Jaune */
Info:      #17a2b8  /* Cyan */
```

### EWM Demo

```css
Primary:   #6c757d  /* Gris */
Secondary: #adb5bd  /* Gris clair */
Success:   #28a745  /* Vert */
Danger:    #dc3545  /* Rouge */
Warning:   #ffc107  /* Jaune */
Info:      #17a2b8  /* Cyan */
+ Banner:  "VERSION DÉMONSTRATION"
```

---

## 📝 STRUCTURE JSON MINIMALE

```json
{
  "id": "mon-client",
  "name": "MON APPLICATION",
  "tagline": "Mon Slogan",
  "colors": {
    "primary": "#123456",
    "secondary": "#789abc"
  },
  "footer": {
    "copyright": "© 2024 Mon Entreprise",
    "subtitle": "Tous droits réservés"
  }
}
```

---

## 🗂️ EMPLACEMENTS DES FICHIERS

### Configuration

```
config/branding/
├── default.json           # EWM par défaut
├── demo.json              # EWM démo
├── eb-vision-2.json       # EB-Vision 2.0
├── client-template.json   # Template
└── [votre-client].json    # Vos configs
```

### Code Source

```
src/
├── services/
│   └── brandingService.js  # Service backend
└── routes/
    └── branding.js         # Routes API

public/
└── js/
    ├── branding-loader.js  # Loader frontend
    └── sidebar-branding.js # Branding sidebar
```

### Assets (Optionnel)

```
public/assets/brands/
├── default/               # Assets EWM
├── demo/                  # Assets démo
├── eb-vision/             # Assets EB-Vision
└── [votre-client]/        # Vos assets
    ├── logo.png           # Logo principal
    └── favicon.ico        # Favicon
```

---

## ⌨️ RACCOURCIS CLAVIER

| Action | Raccourci Windows | Raccourci Mac |
|--------|-------------------|---------------|
| Vider cache | `Ctrl + Shift + R` | `Cmd + Shift + R` |
| Recharger | `Ctrl + R` | `Cmd + R` |
| Recharger force | `Ctrl + F5` | `Cmd + Shift + R` |
| DevTools | `F12` | `Cmd + Option + I` |
| Console | `Ctrl + Shift + J` | `Cmd + Option + J` |

---

## 🧪 TESTS RAPIDES

### Test 1 : Configuration Active

```powershell
# Voir la config dans .env
Select-String -Path ".env" -Pattern "BRAND_CONFIG"
```

### Test 2 : Fichier Existe

```powershell
# Vérifier que le fichier existe
Test-Path "config/branding/eb-vision-2.json"
```

### Test 3 : Serveur Actif

```powershell
# Tester le serveur
Invoke-RestMethod -Uri "http://localhost:3000/api/branding/config"
```

### Test 4 : Branding Chargé

```javascript
// Dans la console du navigateur
console.log(window.currentBranding);
```

---

## 📚 DOCUMENTATION COMPLÈTE

### Guides Essentiels

- **[START-HERE.md](START-HERE.md)** - Démarrage 30 sec
- **[LISEZ-MOI-EN-PREMIER.md](Guides/LISEZ-MOI-EN-PREMIER.md)** - FAQ
- **[GUIDE-DEMARRAGE-URGENT.md](Guides/GUIDE-DEMARRAGE-URGENT.md)** - Dépannage
- **[COMMENT-ACTIVER-WHITE-LABEL.md](Guides/COMMENT-ACTIVER-WHITE-LABEL.md)** - Guide complet

### Référence

- **[README.md](README.md)** - Index principal
- **[INDEX.md](INDEX.md)** - Table des matières
- **[GUIDE-COMPLET-NAVIGATION.md](GUIDE-COMPLET-NAVIGATION.md)** - Navigation

---

## 🆘 SUPPORT RAPIDE

### Je ne sais pas par où commencer

➡️ [START-HERE.md](START-HERE.md)

### J'ai une erreur

➡️ [GUIDE-DEMARRAGE-URGENT.md](Guides/GUIDE-DEMARRAGE-URGENT.md)

### Je veux créer un client

➡️ [COMMENT-ACTIVER-WHITE-LABEL.md](Guides/COMMENT-ACTIVER-WHITE-LABEL.md)

### Je veux tout comprendre

➡️ [README.md](README.md)

---

## ✅ CHECKLIST DÉMARRAGE

- [ ] Fichier `.env` configuré avec `BRAND_CONFIG`
- [ ] Configuration JSON existe dans `config/branding/`
- [ ] Serveur redémarré avec `npm restart`
- [ ] Cache navigateur vidé avec `Ctrl + Shift + R`
- [ ] Application testée
- [ ] Branding vérifié

---

## 📞 LIENS UTILES

| Ressource | Lien |
|-----------|------|
| Documentation | [README.md](README.md) |
| Scripts | [Scripts/](Scripts/) |
| Configurations | [Configurations/](Configurations/) |
| Code Backend | [src/services/brandingService.js](../../src/services/brandingService.js) |
| Code Frontend | [public/js/branding-loader.js](../../public/js/branding-loader.js) |

---

**Version** : 1.0  
**Date** : 2 novembre 2024  
**Statut** : ✅ Production Ready

⚡ **Référence rapide. Commandes essentielles. Solutions immédiates.**

