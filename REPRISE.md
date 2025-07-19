# 📋 FICHIER DE REPRISE - TRS Dashboard

## 🎯 **CONTEXTE GÉNÉRAL**

Application de gestion de temps et ressources (TRS) avec authentification JWT, base de données PostgreSQL, et interface web moderne.

## 🏗️ **ARCHITECTURE**

### **Backend (Node.js + Express)**
- **Port** : 3000
- **Base de données** : PostgreSQL
- **Authentification** : JWT (JSON Web Tokens)
- **Validation** : Joi schemas
- **Hachage** : bcrypt pour les mots de passe

### **Frontend**
- **Pages statiques** : HTML + CSS + JavaScript
- **Framework CSS** : Bootstrap 5.3.0
- **Icônes** : Font Awesome 6.0.0
- **Gestion d'état** : localStorage pour les tokens

## 📁 **STRUCTURE DES FICHIERS**

```
TRS-Affichage/
├── src/
│   ├── routes/
│   │   ├── auth.js          # Authentification (login, logout, etc.)
│   │   ├── users.js         # Gestion des utilisateurs
│   │   ├── divisions.js     # Gestion des divisions
│   │   ├── grades.js        # Gestion des grades
│   │   ├── clients.js       # Gestion des clients
│   │   ├── missions.js      # Gestion des missions
│   │   ├── time-entries.js  # Gestion des saisies de temps
│   │   └── reports.js       # Rapports et statistiques
│   ├── models/
│   │   ├── User.js          # Modèle utilisateur
│   │   ├── Division.js      # Modèle division
│   │   └── ...
│   ├── utils/
│   │   ├── database.js      # Connexion PostgreSQL
│   │   ├── validators.js    # Schémas de validation Joi
│   │   └── auth.js          # Middleware d'authentification
│   └── server.js            # Point d'entrée principal
├── public/
│   ├── dashboard.html       # Page principale
│   ├── users.html          # Gestion utilisateurs
│   ├── divisions.html      # Gestion divisions
│   ├── grades.html         # Gestion grades
│   ├── clients.html        # Gestion clients
│   ├── missions.html       # Gestion missions
│   ├── time-entries.html   # Saisies de temps
│   ├── reports.html        # Rapports
│   └── js/
│       ├── auth.js         # Gestion authentification côté client
│       └── sidebar.js      # Navigation
└── package.json
```

## 🔐 **AUTHENTIFICATION**

### **Identifiants de test**
- **Email** : `admin@example.com`
- **Mot de passe** : `admin123`

### **Flux d'authentification**
1. **Login** : POST `/api/auth/login` avec email/password
2. **Token** : Retourne JWT token stocké dans localStorage
3. **Vérification** : Middleware vérifie token sur routes protégées
4. **Logout** : Supprime token et redirige vers login

### **Pages d'authentification**
- **Login** : `/` (racine) - page de connexion
- **Dashboard** : `/dashboard.html` - page principale après connexion

## 🗄️ **BASE DE DONNÉES**

### **Tables principales**
- `users` - Utilisateurs du système
- `divisions` - Divisions de l'entreprise
- `grades` - Grades hiérarchiques
- `clients` - Clients
- `missions` - Missions/projets
- `time_entries` - Saisies de temps
- `contacts` - Contacts clients

### **Relations**
- `users.division_id` → `divisions.id`
- `divisions.responsable_id` → `users.id`
- `time_entries.user_id` → `users.id`
- `time_entries.mission_id` → `missions.id`

## 🚀 **DÉMARRAGE**

### **Prérequis**
- Node.js installé
- PostgreSQL installé et configuré
- Variables d'environnement configurées

### **Commandes**
```bash
# Installer les dépendances
npm install

# Démarrer le serveur
npm start

# Ou avec nodemon (développement)
npm run dev
```

### **URLs**
- **Application** : http://localhost:3000
- **API Health** : http://localhost:3000/api/health
- **Documentation API** : http://localhost:3000/api/health

## ⚠️ **PROBLÈMES RÉSOLUS**

### ✅ **1. Authentification**
- **Problème** : `Cannot read properties of undefined (reading 'login')`
- **Cause** : Serveur non redémarré après corrections
- **Solution** : Redémarrage complet du serveur
- **Statut** : ✅ RÉSOLU

### ✅ **2. Page de login**
- **Problème** : Redirection automatique vers dashboard
- **Cause** : Token JWT valide dans localStorage
- **Solution** : Navigation privée ou `localStorage.clear()`
- **Statut** : ✅ RÉSOLU

### ✅ **3. Bouton de déconnexion**
- **Problème** : Bouton non réactif
- **Cause** : Sélecteur CSS invalide `:contains()`
- **Solution** : Remplacement par recherche manuelle du texte
- **Statut** : ✅ RÉSOLU

## 🔧 **PROBLÈMES EN COURS**

### ❌ **1. Routes `/statistics`**
- **Problème** : `/statistics` traité comme UUID par routes `/:id`
- **Erreur** : `syntaxe en entrée invalide pour le type uuid : « statistics »`
- **Fichiers concernés** : `src/routes/divisions.js`, `src/routes/users.js`
- **Cause** : Ordre des routes incorrect
- **Solution nécessaire** : Placer routes `/statistics` AVANT routes `/:id`

### ❌ **2. Erreur SQL dans rapports**
- **Problème** : `te.collaborateur_id n'existe pas`
- **Fichier** : `src/routes/reports.js`
- **Cause** : Nom de colonne incorrect
- **Solution nécessaire** : Remplacer par `te.user_id`

### ❌ **3. Modèles non définis**
- **Problème** : `Cannot read properties of undefined (reading 'findAll')`
- **Fichiers** : `src/routes/divisions.js`, `src/routes/users.js`
- **Cause** : Import de modèles incorrect
- **Solution nécessaire** : Vérifier les imports des modèles

## 📝 **TÂCHES À ACCOMPLIR**

### **Priorité 1 - Routes `/statistics`**
```javascript
// Dans src/routes/divisions.js et src/routes/users.js
// PLACER CES ROUTES EN PREMIER :
router.get('/statistics', auth, async (req, res) => { ... });

// AVANT CES ROUTES :
router.get('/:id', auth, async (req, res) => { ... });
```

### **Priorité 2 - Erreur SQL rapports**
```sql
-- Dans src/routes/reports.js
-- REMPLACER :
te.collaborateur_id
-- PAR :
te.user_id
```

### **Priorité 3 - Imports des modèles**
```javascript
// Vérifier dans src/routes/divisions.js et src/routes/users.js
const Division = require('../models/Division');
const User = require('../models/User');
```

## 🧪 **TESTS À EFFECTUER**

### **Test d'authentification**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

### **Test des routes `/statistics`**
```bash
# Avec token d'authentification
curl -X GET http://localhost:3000/api/divisions/statistics \
  -H "Authorization: Bearer <TOKEN>"
```

### **Test du bouton de déconnexion**
1. Se connecter
2. Aller sur dashboard
3. Cliquer sur "Déconnexion"
4. Vérifier redirection vers login

## 🔍 **DEBUGGING**

### **Logs du serveur**
- Les erreurs apparaissent dans la console du serveur
- Logs détaillés des requêtes SQL
- Logs de connexion/déconnexion base de données

### **Outils de développement navigateur**
- **Console** : Erreurs JavaScript
- **Network** : Requêtes API
- **Application** : localStorage pour tokens

### **Commandes utiles**
```bash
# Redémarrer le serveur
taskkill /F /IM node.exe
npm start

# Tester l'API
Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET
```

## 📚 **RESSOURCES**

### **Documentation**
- **Express.js** : https://expressjs.com/
- **JWT** : https://jwt.io/
- **PostgreSQL** : https://www.postgresql.org/docs/
- **Joi Validation** : https://joi.dev/

### **Fichiers de configuration**
- `package.json` : Dépendances et scripts
- `.env` : Variables d'environnement (à créer)
- `server.js` : Configuration Express

## 🎯 **OBJECTIFS SUIVANTS**

1. **Corriger les routes `/statistics`** (priorité haute)
2. **Corriger l'erreur SQL des rapports** (priorité haute)
3. **Vérifier les imports des modèles** (priorité moyenne)
4. **Tester toutes les fonctionnalités** (priorité moyenne)
5. **Optimiser les performances** (priorité basse)

---

**Dernière mise à jour** : 19/07/2025 12:46
**Statut global** : 70% fonctionnel (authentification OK, problèmes de routes à corriger) 