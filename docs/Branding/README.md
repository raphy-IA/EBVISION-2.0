# 🎨 Documentation Système White-Label - Branding

## 📚 Organisation de la Documentation

Toute la documentation du système de branding white-label est organisée ici.

---

## 🚀 DÉMARRAGE RAPIDE

### ⚡ ULTRA-RAPIDE (30 SECONDES)

➡️ **[START-HERE.md](START-HERE.md)** - Démarrage immédiat en 30 secondes !

### Pour Commencer Immédiatement

1. **📖 [Guide de Démarrage Urgent](Guides/GUIDE-DEMARRAGE-URGENT.md)**
   - Problèmes courants et solutions
   - Redémarrage du serveur
   - Vidage du cache
   - Dépannage complet

2. **⚡ [Script de Démarrage Automatique](Scripts/DEMARRER-EB-VISION.bat)**
   - Double-clic pour démarrer automatiquement
   - Configure tout automatiquement
   - Ouvre le navigateur

3. **🧪 [Script de Test](Scripts/TEST-BRANDING-RAPIDE.ps1)**
   - Vérifie votre configuration
   - Teste l'API
   - Diagnostic complet

---

## 📋 STRUCTURE DE LA DOCUMENTATION

```
docs/Branding/
├── README.md (ce fichier)
├── Guides/
│   ├── LISEZ-MOI-EN-PREMIER.md              ← 🎯 Commencez ici !
│   ├── GUIDE-DEMARRAGE-URGENT.md            ← Problèmes et solutions
│   ├── COMMENT-ACTIVER-WHITE-LABEL.md       ← Guide d'activation complet
│   ├── NOUVEAU-SYSTEME-WHITE-LABEL.md       ← Présentation du système
│   ├── RESUME-FINAL-CONFIGURATION-EB-VISION.md
│   ├── BRANDING-LOGIN-LOGOUT-INTEGRATION.md
│   └── CORRECTIONS-LOGIN-LOGOUT-COMPLETE.md
├── Scripts/                                ← 4 scripts + docs
│   ├── configure_branding.py              ← Configuration Python
│   ├── verify_branding.py                 ← Vérification complète Python
│   ├── DEMARRER-EB-VISION.bat             ← Démarrage Windows
│   ├── TEST-BRANDING-RAPIDE.ps1           ← Test PowerShell
│   ├── requirements.txt                   ← Dépendances Python
│   └── README.md                          ← Guide des scripts
└── Configurations/
    └── README-Configurations.md            ← Guide des configurations
```

---

## 🎯 PAR OÙ COMMENCER ?

### Nouveau sur le Système ?

**➡️ [Guides/LISEZ-MOI-EN-PREMIER.md](Guides/LISEZ-MOI-EN-PREMIER.md)**

Ce guide explique :
- ✅ Comment activer une configuration
- ✅ Pourquoi redémarrer le serveur
- ✅ Pourquoi le dossier assets est vide
- ✅ Réponses à toutes les questions fréquentes

---

### Problème avec le Branding ?

**➡️ [Guides/GUIDE-DEMARRAGE-URGENT.md](Guides/GUIDE-DEMARRAGE-URGENT.md)**

Solutions pour :
- ❌ "EWM" s'affiche au lieu de mon branding
- ❌ Les couleurs ne changent pas
- ❌ Le serveur ne démarre pas
- ❌ Erreur 404 sur l'API

---

### Créer une Configuration Client ?

**➡️ [Guides/COMMENT-ACTIVER-WHITE-LABEL.md](Guides/COMMENT-ACTIVER-WHITE-LABEL.md)**

Guide complet pour :
- ✅ Créer une configuration client
- ✅ Choisir les couleurs
- ✅ Ajouter des logos
- ✅ Personnaliser les textes
- ✅ Déployer

---

## 📖 GUIDES DISPONIBLES

### 1. 🎯 [LISEZ-MOI-EN-PREMIER.md](Guides/LISEZ-MOI-EN-PREMIER.md)
**À lire en premier !**

Résumé rapide avec :
- Solution en 3 étapes
- Réponses aux questions fréquentes
- Points clés à retenir

**Temps de lecture** : 5 minutes

---

### 2. 🚨 [GUIDE-DEMARRAGE-URGENT.md](Guides/GUIDE-DEMARRAGE-URGENT.md)
**Problèmes et solutions**

Guide de dépannage complet :
- Procédure de démarrage
- Résolution des problèmes courants
- Tests et vérifications
- Checklist complète

**Temps de lecture** : 10 minutes

---

### 3. 📘 [COMMENT-ACTIVER-WHITE-LABEL.md](Guides/COMMENT-ACTIVER-WHITE-LABEL.md)
**Guide complet d'utilisation**

Documentation exhaustive :
- Configurations disponibles
- Création de configuration client
- Guide de choix des couleurs
- Gestion des logos
- API disponible
- Cas d'usage pratiques

**Temps de lecture** : 20 minutes

---

### 4. 🌟 [NOUVEAU-SYSTEME-WHITE-LABEL.md](Guides/NOUVEAU-SYSTEME-WHITE-LABEL.md)
**Présentation du système**

Vue d'ensemble :
- Fonctionnalités du système
- Configurations prêtes à l'emploi
- Exemples de couleurs
- Trucs et astuces

**Temps de lecture** : 15 minutes

---

### 5. 📊 [RESUME-FINAL-CONFIGURATION-EB-VISION.md](Guides/RESUME-FINAL-CONFIGURATION-EB-VISION.md)
**Configuration EB-Vision 2.0**

Spécifique à votre client original :
- Configuration EB-Vision sauvegardée
- Scénarios d'utilisation
- Tests et vérifications

**Temps de lecture** : 10 minutes

---

### 6. 🔧 [BRANDING-LOGIN-LOGOUT-INTEGRATION.md](Guides/BRANDING-LOGIN-LOGOUT-INTEGRATION.md)
**Intégration Login/Logout**

Documentation technique :
- Modifications login.html
- Modifications logout.html
- Tests et vérifications

**Temps de lecture** : 5 minutes

---

### 7. ✅ [CORRECTIONS-LOGIN-LOGOUT-COMPLETE.md](Guides/CORRECTIONS-LOGIN-LOGOUT-COMPLETE.md)
**Checklist des corrections**

Résumé des modifications :
- Liste des fichiers modifiés
- Checklist de vérification
- Tests validés

**Temps de lecture** : 5 minutes

---

## 🛠️ SCRIPTS UTILES

**📋 [Guide complet des scripts](Scripts/README.md)** - Documentation détaillée

### 1. 🐍 [configure_branding.py](Scripts/configure_branding.py)
**Configuration branding (Python - Multi-plateforme)**

**Usage** :
```bash
# Mode interactif (recommandé)
python docs/Branding/Scripts/configure_branding.py

# Configuration directe
python docs/Branding/Scripts/configure_branding.py eb-vision-2
```

**Ce que fait le script** :
- ✅ Mode interactif avec sélection
- ✅ Liste toutes les configurations
- ✅ Modifie automatiquement `.env`
- ✅ Propose de redémarrer le serveur

---

### 2. 🔍 [verify_branding.py](Scripts/verify_branding.py)
**Vérification complète (Python - Multi-plateforme)**

**Usage** :
```bash
# Vérification standard
python docs/Branding/Scripts/verify_branding.py

# Avec correction automatique
python docs/Branding/Scripts/verify_branding.py --fix
```

**Ce que vérifie le script** :
- ✅ 8 catégories de tests (structure, config, API, etc.)
- ✅ Rapport détaillé avec résumé
- ✅ Correction automatique des problèmes

---

### 3. 🚀 [DEMARRER-EB-VISION.bat](Scripts/DEMARRER-EB-VISION.bat)
**Démarrage automatique (Windows)**

**Usage** : Double-clic sur le fichier

**Ce que fait le script** :
- ✅ Arrête les processus Node existants
- ✅ Démarre le serveur
- ✅ Ouvre le navigateur

---

### 4. 🧪 [TEST-BRANDING-RAPIDE.ps1](Scripts/TEST-BRANDING-RAPIDE.ps1)
**Test rapide (PowerShell - Windows)**

**Usage** :
```powershell
.\docs\Branding\Scripts\TEST-BRANDING-RAPIDE.ps1
```

**Ce que vérifie le script** :
- ✅ Configuration et serveur actif
- ✅ API fonctionne
- ✅ Branding appliqué

---

### 📦 Installation Python

```bash
pip install -r docs/Branding/Scripts/requirements.txt
```

---

## ⚙️ CONFIGURATIONS

### 📁 [README-Configurations.md](Configurations/README-Configurations.md)
**Guide des configurations**

Documentation sur :
- Structure des fichiers de configuration
- Personnalisation des couleurs
- Gestion des logos
- Localisation
- Mode démo

---

## 🎓 PARCOURS D'APPRENTISSAGE

### Pour Débutant

```
1. LISEZ-MOI-EN-PREMIER.md
   ↓
2. DEMARRER-EB-VISION.bat (script)
   ↓
3. NOUVEAU-SYSTEME-WHITE-LABEL.md
   ↓
4. Tester avec différentes configurations
```

---

### Pour Utilisateur Avancé

```
1. COMMENT-ACTIVER-WHITE-LABEL.md
   ↓
2. Créer une configuration client
   ↓
3. Tester avec TEST-BRANDING-RAPIDE.ps1
   ↓
4. Consulter docs/WHITE-LABEL-GUIDE.md (technique)
```

---

### Pour Développeur

```
1. docs/WHITE-LABEL-GUIDE.md (racine docs/)
   ↓
2. docs/TRANSFORMATION-WHITE-LABEL-RECAP.md
   ↓
3. BRANDING-LOGIN-LOGOUT-INTEGRATION.md
   ↓
4. Code source : src/services/brandingService.js
```

---

## 🔍 RECHERCHE RAPIDE

### Je veux...

| Besoin | Document |
|--------|----------|
| Démarrer rapidement | [LISEZ-MOI-EN-PREMIER.md](Guides/LISEZ-MOI-EN-PREMIER.md) |
| Résoudre un problème | [GUIDE-DEMARRAGE-URGENT.md](Guides/GUIDE-DEMARRAGE-URGENT.md) |
| Créer un client | [COMMENT-ACTIVER-WHITE-LABEL.md](Guides/COMMENT-ACTIVER-WHITE-LABEL.md) |
| Comprendre le système | [NOUVEAU-SYSTEME-WHITE-LABEL.md](Guides/NOUVEAU-SYSTEME-WHITE-LABEL.md) |
| Configurer EB-Vision | [RESUME-FINAL-CONFIGURATION-EB-VISION.md](Guides/RESUME-FINAL-CONFIGURATION-EB-VISION.md) |
| Tester ma config | [TEST-BRANDING-RAPIDE.ps1](Scripts/TEST-BRANDING-RAPIDE.ps1) |
| Démarrer auto | [DEMARRER-EB-VISION.bat](Scripts/DEMARRER-EB-VISION.bat) |

---

## 📊 CONFIGURATIONS DISPONIBLES

| ID | Nom | Fichier | Documentation |
|----|-----|---------|---------------|
| `eb-vision-2` | EB-VISION 2.0 | `config/branding/eb-vision-2.json` | [RESUME-FINAL](Guides/RESUME-FINAL-CONFIGURATION-EB-VISION.md) |
| `demo` | EWM DEMO | `config/branding/demo.json` | [COMMENT-ACTIVER](Guides/COMMENT-ACTIVER-WHITE-LABEL.md) |
| `default` | EWM | `config/branding/default.json` | [NOUVEAU-SYSTEME](Guides/NOUVEAU-SYSTEME-WHITE-LABEL.md) |
| `client-example-a` | ACME | `config/branding/client-example-a.json` | [README-Config](Configurations/README-Configurations.md) |
| `client-example-b` | TECHVISION | `config/branding/client-example-b.json` | [README-Config](Configurations/README-Configurations.md) |

---

## 🚀 DÉMARRAGE EN 3 ÉTAPES

### Étape 1 : Choisir une Configuration

```bash
# Dans .env
BRAND_CONFIG=eb-vision-2  # ou demo, ou default
```

### Étape 2 : Redémarrer le Serveur

```bash
npm restart
```

### Étape 3 : Vider le Cache

```
Dans le navigateur : Ctrl + Shift + R
```

**✅ C'est tout !**

---

## 🐛 PROBLÈMES FRÉQUENTS

### "EWM" s'affiche au lieu de mon branding

**Solution** : [GUIDE-DEMARRAGE-URGENT.md](Guides/GUIDE-DEMARRAGE-URGENT.md) - Section "Dépannage"

---

### Les couleurs ne changent pas

**Solution** : [LISEZ-MOI-EN-PREMIER.md](Guides/LISEZ-MOI-EN-PREMIER.md) - Section "Vider le cache"

---

### Le dossier assets est vide

**Solution** : [LISEZ-MOI-EN-PREMIER.md](Guides/LISEZ-MOI-EN-PREMIER.md) - Section "Logos"

**C'est normal !** Les logos ne sont pas obligatoires.

---

### Erreur 404 sur l'API

**Solution** : [GUIDE-DEMARRAGE-URGENT.md](Guides/GUIDE-DEMARRAGE-URGENT.md) - Section "Redémarrage serveur"

Le serveur doit être redémarré.

---

## 📞 SUPPORT

### Documentation Principale

- **[docs/WHITE-LABEL-GUIDE.md](../WHITE-LABEL-GUIDE.md)** - Documentation technique complète (900+ lignes)
- **[docs/QUICK-START-WHITE-LABEL.md](../QUICK-START-WHITE-LABEL.md)** - Démarrage rapide (5 minutes)
- **[docs/TRANSFORMATION-WHITE-LABEL-RECAP.md](../TRANSFORMATION-WHITE-LABEL-RECAP.md)** - Récapitulatif technique

### Fichiers de Configuration

- **[config/branding/](../../config/branding/)** - Dossier des configurations
- **[config/branding/README.md](../../config/branding/README.md)** - Guide des configurations

### Code Source

- **[src/services/brandingService.js](../../src/services/brandingService.js)** - Service backend
- **[src/routes/branding.js](../../src/routes/branding.js)** - Routes API
- **[public/js/branding-loader.js](../../public/js/branding-loader.js)** - Loader frontend

---

## 🎯 CHECKLIST RAPIDE

Avant de commencer :

- [ ] Lire [LISEZ-MOI-EN-PREMIER.md](Guides/LISEZ-MOI-EN-PREMIER.md)
- [ ] Configurer `.env` avec `BRAND_CONFIG`
- [ ] Redémarrer le serveur
- [ ] Vider le cache navigateur
- [ ] Tester avec [TEST-BRANDING-RAPIDE.ps1](Scripts/TEST-BRANDING-RAPIDE.ps1)

---

## 📈 STATISTIQUES

**Documentation créée** : 7 guides + 2 scripts + 1 config = **10 documents**  
**Lignes de documentation** : ~3500+ lignes  
**Temps de lecture total** : ~1h30  
**Temps pour démarrer** : 5 minutes avec les scripts  

---

## ✅ RÉSUMÉ

Cette documentation couvre :

- ✅ Installation et configuration
- ✅ Dépannage et résolution de problèmes
- ✅ Création de configurations clients
- ✅ Scripts automatisés
- ✅ Tests et vérifications
- ✅ Exemples et cas d'usage
- ✅ Documentation technique complète

**Commencez par** : [Guides/LISEZ-MOI-EN-PREMIER.md](Guides/LISEZ-MOI-EN-PREMIER.md)

---

**Date de création** : 2 novembre 2024  
**Version** : 1.0  
**Statut** : Production Ready 🚀

