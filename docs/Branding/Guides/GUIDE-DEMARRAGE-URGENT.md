# 🚨 GUIDE DE DÉMARRAGE - URGENT

## ⚠️ PROBLÈME IDENTIFIÉ

Vous avez configuré `BRAND_CONFIG=eb-vision-2` dans `.env` mais l'application affiche toujours "EWM".

## ✅ SOLUTION EN 3 ÉTAPES

### Étape 1 : Vérifier le fichier .env

Votre fichier `.env` doit contenir (comme vous avez déjà) :

```bash
BRAND_CONFIG=eb-vision-2
```

✅ **C'est bon !**

---

### Étape 2 : Redémarrer le Serveur (OBLIGATOIRE)

**Le serveur DOIT être redémarré pour charger la nouvelle configuration !**

```bash
# Dans le terminal PowerShell

# 1. Arrêter tous les processus Node
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Redémarrer le serveur
npm start
```

**OU en une commande :**

```bash
npm restart
```

---

### Étape 3 : Vider le Cache du Navigateur

**Le navigateur met en cache l'ancienne configuration !**

#### Option A : Rechargement forcé
```
Windows/Linux : Ctrl + Shift + R
Mac : Cmd + Shift + R
```

#### Option B : Vider le localStorage (Recommandé)

1. Ouvrir la console du navigateur (F12)
2. Aller dans l'onglet "Console"
3. Taper :

```javascript
localStorage.removeItem('brandingConfig');
localStorage.removeItem('sidebarCache');
location.reload();
```

---

## 📋 RÉPONSES À VOS QUESTIONS

### ❓ "Le dossier assets/brands/eb-vision est vide ?"

**✅ C'EST NORMAL !**

Les icônes ne sont **PAS obligatoires**. L'application utilise les icônes FontAwesome par défaut.

**Si vous voulez ajouter vos propres logos :**

1. Créez vos fichiers :
   - `logo.svg` (logo principal)
   - `icon.svg` (petite icône)
   - `favicon.ico` (favicon navigateur)

2. Copiez-les dans `public\assets\brands\eb-vision\`

3. **Ce n'est pas nécessaire pour que le branding fonctionne !**

---

### ❓ "Les icônes sont gravées en dur ?"

**NON !**

- Sans logo personnalisé : Icône FontAwesome `<i class="fas fa-eye"></i>`
- Avec logo personnalisé : Votre logo SVG est chargé dynamiquement

**Les deux fonctionnent !**

---

### ❓ "Les couleurs aussi sont gravées en dur ?"

**NON !**

Les couleurs sont **dynamiques** et appliquées via CSS Variables :

```css
:root {
    --brand-primary: #2c3e50;    /* De votre config */
    --brand-secondary: #3498db;   /* De votre config */
}
```

**Si les couleurs ne changent pas :**
1. Videz le cache (Ctrl+Shift+R)
2. Rechargez la page

---

### ❓ "Le fichier default.json impacte-t-il ?"

**OUI, si vous n'avez pas de BRAND_CONFIG dans .env !**

```bash
# Si .env ne contient PAS BRAND_CONFIG
# ou si BRAND_CONFIG est vide
→ Utilise default.json

# Si BRAND_CONFIG=eb-vision-2
→ Utilise eb-vision-2.json

# Si BRAND_CONFIG=demo
→ Utilise demo.json
```

---

### ❓ "Comment utiliser demo.json ?"

**Très simple :**

```bash
# Dans .env
BRAND_CONFIG=demo

# Redémarrer
npm restart

# Vider cache navigateur
Ctrl + Shift + R
```

**Résultat :**
- Nom : "ENTERPRISE WORKFLOW MANAGEMENT - DEMO"
- Bannière orange : "🎯 DEMO VERSION"
- Couleurs neutres

---

### ❓ "En mode demo, y a-t-il une base de données séparée ?"

**NON !**

**Même base de données pour toutes les configurations.**

Le mode demo :
- ✅ Change l'apparence (nom, couleurs, bannière)
- ✅ Peut afficher un watermark "DEMO"
- ❌ N'utilise PAS une base de données différente

**C'est uniquement un branding différent, pas une instance séparée.**

Si vous voulez des données de test :
```json
{
  "demo": {
    "mode": true,
    "sampleData": true
  }
}
```

**Mais cela ne change pas la base de données utilisée !**

---

## 🔧 PROCÉDURE COMPLÈTE DE DÉMARRAGE

### Pour EB-Vision 2.0 (Votre Original)

```bash
# 1. Vérifier .env
cat .env | Select-String "BRAND_CONFIG"
# Doit afficher : BRAND_CONFIG=eb-vision-2

# 2. Arrêter Node
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# 3. Démarrer le serveur
npm start

# 4. Dans le navigateur (après ouverture)
# F12 → Console → Taper :
localStorage.clear();
location.reload();
```

---

### Pour Demo

```bash
# 1. Modifier .env
BRAND_CONFIG=demo

# 2. Redémarrer
npm restart

# 3. Vider cache navigateur
Ctrl + Shift + R
```

---

## 🎯 CHECKLIST DE VÉRIFICATION

Après avoir suivi les étapes ci-dessus :

- [ ] Fichier `.env` contient `BRAND_CONFIG=eb-vision-2`
- [ ] Serveur redémarré (`npm restart`)
- [ ] Cache navigateur vidé (`Ctrl+Shift+R`)
- [ ] Page rechargée (F5)
- [ ] Console ouverte (F12) pour voir les logs

**Dans la console, vous devriez voir :**

```
🎨 Initialisation du branding...
✅ Configuration branding 'eb-vision-2' chargée avec succès
🎨 Application du branding...
✅ Branding chargé avec succès: EB-VISION 2.0
```

**Si vous voyez "EWM" au lieu de "EB-VISION" :**

```javascript
// Dans la console :
console.log(localStorage.getItem('brandingConfig'));
// Si ça affiche du texte avec "EWM", le cache n'est pas vidé !

// Forcer la suppression :
localStorage.clear();
location.reload();
```

---

## 🐛 DÉPANNAGE

### Problème : Le serveur ne démarre pas

```bash
# Vérifier les erreurs
npm start

# Si erreur de port déjà utilisé :
Get-Process -Name node | Stop-Process -Force
npm start
```

---

### Problème : "EWM" s'affiche toujours

```bash
# 1. Vérifier que le serveur a bien redémarré
# Regardez les logs du serveur, vous devriez voir :
# "Server running on port 3000"

# 2. Vider COMPLÈTEMENT le cache
# F12 → Application → Storage → Clear site data

# 3. Ou en mode incognito
# Ctrl + Shift + N (Chrome)
# Ouvrir http://localhost:3000
```

---

### Problème : Les couleurs ne changent pas

```javascript
// Dans la console navigateur (F12) :

// 1. Vérifier la config chargée
fetch('/api/branding/config')
  .then(r => r.json())
  .then(d => console.log('Config:', d));

// 2. Vérifier les CSS variables
console.log(getComputedStyle(document.documentElement)
  .getPropertyValue('--brand-primary'));

// 3. Forcer rechargement
localStorage.removeItem('brandingConfig');
location.reload();
```

---

### Problème : Erreur 404 sur /api/branding/config

**Le serveur n'a pas été redémarré !**

```bash
# Tuer tous les processus Node
Get-Process -Name node | Stop-Process -Force

# Redémarrer proprement
npm start
```

---

## 📊 TEST RAPIDE

### Vérifier que tout fonctionne :

```bash
# 1. Terminal 1 : Démarrer le serveur
npm start

# 2. Terminal 2 : Tester l'API
curl http://localhost:3000/api/branding/config

# Devrait retourner du JSON avec :
# "name": "EB-VISION 2.0"
```

### Dans le navigateur :

```javascript
// Console (F12)
fetch('/api/branding/config')
  .then(r => r.json())
  .then(d => console.log('Nom:', d.data.app.name));

// Devrait afficher : "Nom: EB-VISION 2.0"
```

---

## ✅ SI TOUT EST OK

Vous devriez voir :

### Login Page (`http://localhost:3000/login.html`)
- Titre : "EB-VISION 2.0 - Connexion"
- Header : "EBVISION 2.0"
- Tagline : "Gestion Intelligente des Ressources"
- Couleurs bleues (#2c3e50)

### Dashboard (`http://localhost:3000/dashboard.html`)
- Sidebar title : "EB-VISION"
- Sidebar subtitle : "Gestion Intelligente des Ressources"
- Footer : "© 2025 EBVISION 2.0"

### Console (F12)
```
✅ Configuration branding 'eb-vision-2' chargée avec succès
✅ Branding chargé avec succès: EB-VISION 2.0
```

---

## 🚨 SI ÇA NE FONCTIONNE TOUJOURS PAS

**Envoyez-moi les informations suivantes :**

1. **Logs du serveur** (ce qui s'affiche dans le terminal npm start)

2. **Logs de la console navigateur** (F12 → Console)

3. **Résultat de cette commande :**
```bash
curl http://localhost:3000/api/branding/config
```

4. **Contenu de localStorage :**
```javascript
// Dans la console
console.log(localStorage.getItem('brandingConfig'));
```

---

## 💡 ASTUCE IMPORTANTE

**Après CHAQUE modification du fichier `.env` :**

```bash
# 1. TOUJOURS redémarrer le serveur
npm restart

# 2. TOUJOURS vider le cache navigateur
Ctrl + Shift + R

# 3. Ou localStorage.clear() dans la console
```

---

## 📞 EN RÉSUMÉ

| Action | Commande | Quand |
|--------|----------|-------|
| Changer config | Modifier `.env` | Une fois |
| Redémarrer serveur | `npm restart` | **Obligatoire après chaque changement .env** |
| Vider cache | `Ctrl+Shift+R` | **Obligatoire après redémarrage** |
| Vider localStorage | `localStorage.clear()` | Si cache navigateur ne suffit pas |

---

**Date** : 2 novembre 2024  
**Version** : Guide de démarrage urgent

