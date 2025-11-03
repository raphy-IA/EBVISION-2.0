# ⚡ LISEZ-MOI EN PREMIER - PROBLÈME RÉSOLU

## 🎯 VOTRE SITUATION

Vous avez mis `BRAND_CONFIG=eb-vision-2` dans `.env` mais l'application affiche toujours "EWM".

## ✅ LA CAUSE

**Le serveur n'a PAS été redémarré après la modification du `.env` !**

Le fichier `.env` est lu UNIQUEMENT au démarrage du serveur. Si vous modifiez `.env` sans redémarrer, les changements ne sont PAS appliqués.

---

## 🚀 SOLUTION EN 3 COMMANDES

```bash
# 1. Arrêter Node (si en cours)
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Démarrer le serveur
npm start

# 3. Dans le navigateur, vider le cache
# Appuyez sur : Ctrl + Shift + R
```

**C'EST TOUT !**

---

## 📋 RÉPONSES À VOS QUESTIONS

### ❓ Le dossier `assets\brands\eb-vision\` est vide ?

**✅ C'EST NORMAL !**

- Les logos ne sont **PAS obligatoires**
- L'application utilise FontAwesome par défaut
- Vous pouvez ajouter des logos plus tard (optionnel)
- L'application fonctionne parfaitement sans logos

**Voir** : `public\assets\brands\eb-vision\README.md` pour détails

---

### ❓ Les icônes et couleurs sont "gravées en dur" ?

**NON !**

- Icônes : FontAwesome par défaut, ou vos logos si fournis
- Couleurs : **100% dynamiques** via CSS Variables

**Si les couleurs ne changent pas :**
```
Ctrl + Shift + R dans le navigateur
```

---

### ❓ Le fichier `default.json` impacte-t-il ?

**OUI, si `.env` ne contient pas `BRAND_CONFIG` !**

Priorité :
```
1. Si BRAND_CONFIG=eb-vision-2 → Utilise eb-vision-2.json
2. Si BRAND_CONFIG=demo → Utilise demo.json  
3. Si BRAND_CONFIG vide ou absent → Utilise default.json
```

---

### ❓ Comment utiliser `demo.json` ?

```bash
# Dans .env
BRAND_CONFIG=demo

# Redémarrer
npm restart

# Vider cache navigateur
Ctrl + Shift + R
```

---

### ❓ Mode demo = base de données séparée ?

**NON !**

- Même base de données pour toutes les configurations
- Le branding ne change que l'apparence (nom, couleurs, bannière)
- Les données restent les mêmes

---

## 🔍 TEST RAPIDE

### Vérifier que tout est OK :

```powershell
# Lancer le script de test
.\TEST-BRANDING-RAPIDE.ps1
```

Ce script vérifie :
- ✅ Fichier `.env` correct
- ✅ Configuration existe
- ✅ Serveur en cours
- ✅ API fonctionne
- ✅ Branding actif

---

## 📊 VÉRIFICATION MANUELLE

### 1. Serveur

```bash
# Terminal
npm start

# Devrait afficher :
# Server running on port 3000
```

### 2. API

```bash
# Autre terminal
curl http://localhost:3000/api/branding/config

# Devrait contenir :
# "name": "EB-VISION 2.0"
```

### 3. Navigateur

```
http://localhost:3000/login.html
```

**Devrait afficher :**
- Titre : "EB-VISION 2.0 - Connexion"
- Header : "EBVISION 2.0"
- Couleurs bleues

**Console (F12) devrait afficher :**
```
✅ Configuration branding 'eb-vision-2' chargée avec succès
✅ Branding chargé avec succès: EB-VISION 2.0
```

---

## 🐛 SI ÇA NE MARCHE TOUJOURS PAS

### Étape 1 : Vider COMPLÈTEMENT le cache

```javascript
// Dans la console navigateur (F12) :
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Étape 2 : Mode Incognito

```
Ctrl + Shift + N (Chrome)
Cmd + Shift + N (Safari)

Puis : http://localhost:3000/login.html
```

Si ça fonctionne en mode incognito → **C'est un problème de cache !**

### Étape 3 : Vérifier les logs

```javascript
// Console navigateur (F12)
fetch('/api/branding/config')
  .then(r => r.json())
  .then(d => console.log('Config:', d.data.app.name));

// Devrait afficher : "Config: EB-VISION 2.0"
```

---

## 📁 CONFIGURATIONS DISPONIBLES

| ID | Nom | Fichier | Usage |
|----|-----|---------|-------|
| `eb-vision-2` | **EB-VISION 2.0** | `eb-vision-2.json` | Votre original |
| `demo` | **EWM DEMO** | `demo.json` | Présentations |
| `default` | **EWM** | `default.json` | Neutre |

---

## 🎨 POUR CHANGER DE BRANDING

```bash
# 1. Modifier .env
BRAND_CONFIG=demo  # ou eb-vision-2, ou default

# 2. Redémarrer (OBLIGATOIRE)
npm restart

# 3. Vider cache navigateur (OBLIGATOIRE)
Ctrl + Shift + R
```

**Ces 3 étapes sont TOUJOURS nécessaires !**

---

## 📚 DOCUMENTATION COMPLÈTE

Si vous voulez tout comprendre en détail :

1. **[GUIDE-DEMARRAGE-URGENT.md](GUIDE-DEMARRAGE-URGENT.md)** ← Problèmes et solutions
2. **[RESUME-FINAL-CONFIGURATION-EB-VISION.md](RESUME-FINAL-CONFIGURATION-EB-VISION.md)** ← Vue d'ensemble
3. **[docs/WHITE-LABEL-GUIDE.md](docs/WHITE-LABEL-GUIDE.md)** ← Documentation technique

---

## ✅ RÉSUMÉ EN 3 LIGNES

1. **Modifier `.env`** : `BRAND_CONFIG=eb-vision-2`
2. **Redémarrer** : `npm restart` (OBLIGATOIRE)
3. **Vider cache** : `Ctrl+Shift+R` dans le navigateur (OBLIGATOIRE)

**Après ces 3 étapes, EB-VISION 2.0 s'affiche !**

---

## 🎯 POINTS CLÉS À RETENIR

✅ `.env` se lit UNIQUEMENT au démarrage  
✅ Logos ne sont PAS obligatoires  
✅ Couleurs sont 100% dynamiques  
✅ Même base de données pour toutes les configs  
✅ TOUJOURS redémarrer après changement `.env`  
✅ TOUJOURS vider le cache navigateur  

---

**Date** : 2 novembre 2024  
**Fichier** : LISEZ-MOI-EN-PREMIER.md

