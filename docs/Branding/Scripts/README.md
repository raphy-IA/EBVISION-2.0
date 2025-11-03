# 🛠️ Scripts de Branding - Guide d'Utilisation

## 📋 Vue d'Ensemble

Ce dossier contient **6 scripts** pour gérer et tester le système de branding :
- **2 scripts Python** (multi-plateforme, administration)
- **2 scripts Node.js** (même fonctionnalité, pour environnements Node-only)
- **2 scripts Windows** (démarrage et test rapide)

> ⚠️ **IMPORTANT** : Toutes les dépendances sont gérées dans le `package.json` **PRINCIPAL** (racine du projet).
> Il n'y a **PAS** de `npm install` à faire dans ce dossier !

---

## 🐍 Scripts Python

### 1. configure_branding.py

**Objectif** : Configurer facilement le branding actif

**Usage** :

```bash
# Mode interactif (recommandé)
python docs/Branding/Scripts/configure_branding.py

# Configuration directe
python docs/Branding/Scripts/configure_branding.py eb-vision-2

# Lister les configurations
python docs/Branding/Scripts/configure_branding.py --list

# Aide
python docs/Branding/Scripts/configure_branding.py --help
```

**Fonctionnalités** :
- ✅ Mode interactif avec liste des configurations
- ✅ Liste toutes les configurations disponibles
- ✅ Affiche la configuration actuelle
- ✅ Modifie automatiquement le `.env`
- ✅ Propose de redémarrer le serveur
- ✅ Affiche les prochaines étapes

**Exemple** :

```bash
$ python docs/Branding/Scripts/configure_branding.py

═══════════════════════════════════════════════════════════
        MODE INTERACTIF - CONFIGURATION BRANDING
═══════════════════════════════════════════════════════════

ℹ Configuration actuelle: default

═══════════════════════════════════════════════════════════
           CONFIGURATIONS DISPONIBLES
═══════════════════════════════════════════════════════════

ID                   Nom                                      Fichier
-------------------- ---------------------------------------- ------------------------------
default              ENTERPRISE WORKFLOW MANAGEMENT           default.json
demo                 ENTERPRISE WORKFLOW MANAGEMENT           demo.json
eb-vision-2          EB-VISION 2.0                           eb-vision-2.json

Entrez l'ID de la configuration à activer (ou 'q' pour quitter): eb-vision-2

✓ Configuration mise à jour dans .env
ℹ Ancienne configuration: default
ℹ Nouvelle configuration: eb-vision-2
ℹ Nom de l'application: EB-VISION 2.0
```

---

### 2. verify_branding.py

**Objectif** : Vérifier que tout le système de branding fonctionne correctement

**Usage** :

```bash
# Vérification standard
python docs/Branding/Scripts/verify_branding.py

# Mode verbeux (plus de détails)
python docs/Branding/Scripts/verify_branding.py --verbose

# Avec correction automatique
python docs/Branding/Scripts/verify_branding.py --fix

# Aide
python docs/Branding/Scripts/verify_branding.py --help
```

**Ce qui est vérifié** :

1. **Structure du projet**
   - ✅ Présence de `package.json`
   - ✅ Dossier `config/branding/`
   - ✅ Dossiers source (`src/`, `public/`)

2. **Fichier .env**
   - ✅ Existence du fichier
   - ✅ Présence de `BRAND_CONFIG`
   - ✅ Valeur valide

3. **Fichier de configuration**
   - ✅ Existence du fichier JSON
   - ✅ JSON valide
   - ✅ Champs requis présents
   - ✅ Couleurs définies

4. **Assets**
   - ✅ Dossier assets existe
   - ✅ Logos présents (optionnel)

5. **Fichiers source**
   - ✅ `brandingService.js`
   - ✅ `branding.js` (routes)
   - ✅ `branding-loader.js`
   - ✅ `sidebar-branding.js`
   - ✅ `brand-variables.css`

6. **Serveur Node.js**
   - ✅ Processus actif
   - ✅ PID du serveur

7. **API de branding**
   - ✅ API accessible
   - ✅ Réponse HTTP 200
   - ✅ JSON valide
   - ✅ Configuration correcte

8. **Documentation**
   - ✅ Présence des guides
   - ✅ README principal

**Exemple de sortie** :

```bash
$ python docs/Branding/Scripts/verify_branding.py

═══════════════════════════════════════════════════════════
        VÉRIFICATION COMPLÈTE DU BRANDING
═══════════════════════════════════════════════════════════

Date: 2024-11-02 16:30:45
Système: Windows 10
Python: 3.11.0
Répertoire: D:\Projects\EB-Vision 2.0

1. STRUCTURE DU PROJET
────────────────────────────────────────────
✓ package.json trouvé
✓ Dossier config/branding/ existe
ℹ   5 configurations trouvées
✓ Services backend: src/services
✓ Routes API: src/routes
✓ JavaScript frontend: public/js
✓ Assets de branding: public/assets/brands

2. FICHIER .ENV
────────────────────────────────────────────
✓ Fichier .env existe
✓ BRAND_CONFIG trouvé: eb-vision-2

3. FICHIER DE CONFIGURATION
────────────────────────────────────────────
✓ Fichier de configuration existe: eb-vision-2.json
✓ JSON valide
✓ ID: ✓
✓ Nom de l'application: ✓
✓ Slogan: ✓
✓ Couleurs: ✓
✓ Footer: ✓
✓ Toutes les couleurs définies (6)

...

═══════════════════════════════════════════════════════════
              RÉSUMÉ DE LA VÉRIFICATION
═══════════════════════════════════════════════════════════

✓ Succès: 24
⚠ Avertissements: 1
✗ Erreurs: 0

RECOMMANDATIONS:
⚠ Quelques avertissements, mais le système devrait fonctionner

STATUT GLOBAL: BON (avec avertissements) ⚠
```

---

## 📦 Scripts Node.js

### 3. configure_branding.js

**Objectif** : Version Node.js du script de configuration (pour hébergements Node-only)

**Usage** :

```bash
# OPTION 1 : Via npm (recommandé)
npm run branding:configure

# OPTION 2 : Direct
node docs/Branding/Scripts/configure_branding.js

# Configuration directe
node docs/Branding/Scripts/configure_branding.js eb-vision-2

# Lister les configurations
npm run branding:list
```

**Fonctionnalités** :
- ✅ Identiques à la version Python
- ✅ Interface interactive avec inquirer
- ✅ Colorisé avec chalk
- ✅ Ne nécessite pas Python
- ✅ Parfait pour CI/CD Node-only

---

### 4. verify_branding.js

**Objectif** : Version Node.js du script de vérification

**Usage** :

```bash
# OPTION 1 : Via npm (recommandé)
npm run branding:verify

# OPTION 2 : Direct
node docs/Branding/Scripts/verify_branding.js

# Mode verbeux
node docs/Branding/Scripts/verify_branding.js --verbose

# Avec correction automatique
npm run branding:verify:fix
```

**Ce qui est vérifié** :
- Identique à la version Python (8 catégories de tests)

---

## 💻 Scripts Windows

### 5. DEMARRER-EB-VISION.bat

**Objectif** : Démarrage automatique complet de l'application

**Usage** :

```batch
# Double-clic sur le fichier
# OU
docs\Branding\Scripts\DEMARRER-EB-VISION.bat
```

**Actions effectuées** :
1. ✅ Vérifie `.env`
2. ✅ Ajoute `BRAND_CONFIG` si absent
3. ✅ Arrête les processus Node existants
4. ✅ Démarre le serveur
5. ✅ Ouvre le navigateur
6. ✅ Affiche instructions pour vider le cache

---

### 6. TEST-BRANDING-RAPIDE.ps1

**Objectif** : Test rapide du branding (PowerShell)

**Usage** :

```powershell
.\docs\Branding\Scripts\TEST-BRANDING-RAPIDE.ps1
```

**Vérifications** :
1. ✅ Fichier `.env`
2. ✅ Configuration existe
3. ✅ Dossiers assets
4. ✅ Serveur actif
5. ✅ API fonctionne

---

## 📊 Comparaison des Scripts

| Critère | Python | Node.js | Windows |
|---------|--------|---------|---------|
| **Scripts** | configure_branding.py<br>verify_branding.py | configure_branding.js<br>verify_branding.js | DEMARRER-EB-VISION.bat<br>TEST-BRANDING-RAPIDE.ps1 |
| **Plateforme** | Multi-plateforme | Multi-plateforme | Windows uniquement |
| **Prérequis** | Python 3.7+<br>pip install requests | Node.js<br>npm install (racine) | Windows 10+<br>Node.js |
| **Avantages** | Indépendant de Node.js<br>Admin système | Même stack que l'app<br>CI/CD Node-only | Rapide<br>Double-clic |
| **Utilisation** | `python docs/.../script.py` | `npm run branding:*` | Double-clic sur .bat |

---

## 🎯 Cas d'Usage

### Scénario 1 : Première Installation

```bash
# 0. Installer les dépendances (UNE SEULE FOIS à la racine)
npm install

# 1. Vérifier que tout est OK
npm run branding:verify:fix
# OU python docs/Branding/Scripts/verify_branding.py --fix

# 2. Configurer le branding
npm run branding:configure
# OU python docs/Branding/Scripts/configure_branding.py eb-vision-2

# 3. Démarrer (Windows)
docs\Branding\Scripts\DEMARRER-EB-VISION.bat
```

---

### Scénario 2 : Changer de Configuration

```bash
# OPTION 1 : Node.js (recommandé)
npm run branding:configure

# OPTION 2 : Python
python docs/Branding/Scripts/configure_branding.py

# Configuration directe
npm run branding:configure demo
```

---

### Scénario 3 : Problème Technique

```bash
# 1. Test rapide (Windows)
.\docs\Branding\Scripts\TEST-BRANDING-RAPIDE.ps1

# 2. Vérification complète
npm run branding:verify
# OU python docs/Branding/Scripts/verify_branding.py --verbose

# 3. Tentative de correction
npm run branding:verify:fix
# OU python docs/Branding/Scripts/verify_branding.py --fix
```

---

### Scénario 4 : Audit Complet

```bash
# Vérification exhaustive
python docs/Branding/Scripts/verify_branding.py --verbose > audit.txt

# Consulter le rapport
cat audit.txt
```

---

## 🔧 Prérequis

### ⚠️ IMPORTANT : Installation Unique

**Toutes les dépendances sont gérées à la RACINE du projet** :

```bash
# À la racine du projet (UNE SEULE FOIS)
npm install
```

Cela installe automatiquement :
- `chalk` (couleurs terminal)
- `inquirer` (questions interactives)
- `fs-extra` (opérations fichiers)
- Et toutes les autres dépendances du projet

### Pour les scripts Python (optionnel)

```bash
# Python 3.7+
python --version

# Installer les dépendances Python
pip install -r docs/Branding/Scripts/requirements.txt
```

### Pour les scripts Windows

- Windows 10+
- PowerShell 5.0+
- Node.js installé

---

## 📝 Notes Importantes

### Scripts Python

- **Multi-plateforme** : Fonctionnent sur Windows, Linux, Mac
- **Indépendants** : Ne nécessitent pas Node.js
- **Administration** : Parfait pour tâches système
- **Interactifs** : Mode question/réponse

### Scripts Node.js

- **Même stack** : Utilise les mêmes dépendances que l'application
- **CI/CD** : Parfait pour environnements Node-only
- **NPM Scripts** : Commandes raccourcies (`npm run branding:*`)
- **Pas de Python requis** : Fonctionne avec Node.js uniquement

### Scripts Windows

- **Rapides** : Optimisés pour Windows
- **Double-clic** : Exécution immédiate
- **Visuels** : Affichage formaté

---

## 🆘 Dépannage

### ❌ Erreur "Cannot find module 'fs-extra'" (Node.js)

**Cause** : Dépendances non installées

**Solution** :
```bash
# À LA RACINE du projet (pas dans docs/!)
npm install
```

### ❌ Erreur "Python not found"

**Cause** : Python non installé

**Solution** :
```bash
# OPTION 1 : Utiliser les scripts Node.js à la place
npm run branding:configure

# OPTION 2 : Installer Python
# https://www.python.org/downloads/

# OPTION 3 : Utiliser py sur Windows
py docs/Branding/Scripts/configure_branding.py
```

### ❌ Erreur "requests module not found" (Python)

**Solution** :
```bash
pip install -r docs/Branding/Scripts/requirements.txt
```

### ❌ Erreur "Permission denied"

```bash
# Linux/Mac : Rendre exécutable
chmod +x docs/Branding/Scripts/*.py

# Windows : Exécuter en tant qu'administrateur
```

### ⚠️ Erreur d'exécution PowerShell

```powershell
# Si "script désactivé"
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

# Puis réessayer
.\docs\Branding\Scripts\TEST-BRANDING-RAPIDE.ps1
```

---

## 📚 Documentation Complète

- **[START-HERE.md](../START-HERE.md)** - Démarrage rapide
- **[README.md](../README.md)** - Index principal
- **[REFERENCE-RAPIDE.md](../REFERENCE-RAPIDE.md)** - Commandes essentielles

---

**Version** : 1.0  
**Date** : 2 novembre 2024  
**Statut** : ✅ Production Ready

🛠️ **Scripts automatiques. Configuration facile. Vérification complète.**

