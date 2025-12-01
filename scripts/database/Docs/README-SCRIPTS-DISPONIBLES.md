# 📚 Scripts d'Initialisation de Base de Données

## 🎯 Deux Logiques Disponibles

### **1️⃣ LOGIQUE COMPLÈTE (1 script fait TOUT)**

#### **Script : `0-init-complete.js`**

```bash
node scripts/database/0-init-complete.js
```

**✅ Ce script fait TOUT automatiquement :**
- 📦 Crée 81 tables (structure complète)
- 👥 Crée 11 rôles (7 système + 4 non-système)
- 👤 Crée le super admin (`admin@ebvision.com` / `Admin@2025`)
- 🔐 Crée 321 permissions (scannées depuis le code)
- ✅ Assigne toutes les permissions au SUPER_ADMIN

**⏱️ Durée : ~20-30 secondes**

**🎯 Quand l'utiliser :**
- ✅ Nouvelle installation pour un client
- ✅ Réinitialisation complète
- ✅ Vous voulez le plus rapide et simple

---

### **2️⃣ LOGIQUE MODULAIRE (4 scripts séparés)**

Exécutez les scripts **dans cet ordre** :

#### **Étape 1 : Créer les tables et la structure**
```bash
node scripts/database/1-init-database-tables.js
```
**Ce qu'il fait :**
- 📦 Crée 81 tables
- 👥 Crée 11 rôles de base

#### **Étape 2 : Créer le super administrateur**
```bash
node scripts/database/2-create-super-admin.js
```
**Ce qu'il fait :**
- 👤 Crée le super admin avec login interactif
- 🔑 Vous choisissez l'email et le mot de passe

#### **Étape 3 : Synchroniser toutes les permissions**
```bash
node scripts/database/sync-all-permissions-complete.js
```
**Ce qu'il fait :**
- 🔍 Scanne toutes les routes API
- 🔍 Scanne toutes les pages HTML
- 🔍 Scanne tous les menus
- 🔐 Crée 321 permissions

#### **Étape 4 : Assigner les permissions au SUPER_ADMIN**
```bash
node scripts/database/3-assign-all-permissions.js
```
**Ce qu'il fait :**
- ✅ Assigne toutes les permissions au rôle SUPER_ADMIN
- ✅ Assigne toutes les permissions à l'utilisateur super admin

**🎯 Quand utiliser la logique modulaire :**
- ✅ Vous voulez plus de contrôle
- ✅ Vous voulez personnaliser chaque étape
- ✅ Vous voulez déboguer un problème spécifique
- ✅ Vous voulez seulement refaire certaines étapes

---

## 📊 Comparaison

| Critère | Logique Complète | Logique Modulaire |
|---------|------------------|-------------------|
| **Nombre de commandes** | 1 | 4 |
| **Temps total** | ~25 secondes | ~30 secondes |
| **Contrôle** | Automatique | Manuel |
| **Personnalisation** | Aucune | Complète |
| **Difficulté** | Très facile | Facile |
| **Recommandé pour** | Production | Développement / Debug |

---

## 🆘 Scripts Utilitaires

### **Générer des données de démo**
```bash
node scripts/database/4-generate-demo-data.js
```
**Ce qu'il fait :**
- 👥 Crée des utilisateurs de test
- 🏢 Crée des clients fictifs
- 📊 Crée des missions de test
- 💼 Crée des opportunités fictives

### **Corriger le schéma (si nécessaire)**
```bash
node scripts/database/5-fix-database-schema.sql
```
**Ce qu'il fait :**
- 🔧 Applique des correctifs au schéma
- ✅ Met à jour les colonnes manquantes
- 🎨 Ajoute les badges aux rôles

### **Réinitialiser complètement la base**
```bash
node scripts/database/0-reset-database.js
```
**⚠️ ATTENTION : Supprime TOUTES les données !**

---

## 🔑 Identifiants par Défaut

**Logique Complète (`0-init-complete.js`) :**
```
Email       : admin@ebvision.com
Mot de passe: Admin@2025
```

**Logique Modulaire (`2-create-super-admin.js`) :**
```
Vous choisissez l'email et le mot de passe de manière interactive
```

---

## 📋 Résultat Final (Les Deux Logiques)

✅ **81 tables** créées  
✅ **11 rôles** créés :
   - **Système (7)** : SUPER_ADMIN, ADMIN_IT, IT, ADMIN, MANAGER, CONSULTANT, COLLABORATEUR
   - **Non-système (4)** : ASSOCIE, DIRECTEUR, SUPER_USER, SUPERVISEUR

✅ **321 permissions** créées et assignées :
   - Dashboard : 20
   - Clients : 11
   - Missions : 17
   - Opportunities : 20
   - Campaigns : 16
   - Reports : 9
   - HR : 47
   - Time : 16
   - Config : 54
   - API : 22
   - Menu : 41
   - Pages : 13
   - Autres : 35

✅ **1 super admin** avec accès complet à tout

---

## 🚀 Démarrage Rapide

### Pour Production (Client)
```bash
# Logique complète (recommandé)
node scripts/database/0-init-complete.js
npm start
```

### Pour Développement
```bash
# Logique modulaire + données de démo
node scripts/database/1-init-database-tables.js
node scripts/database/2-create-super-admin.js
node scripts/database/sync-all-permissions-complete.js
node scripts/database/3-assign-all-permissions.js
node scripts/database/4-generate-demo-data.js
npm start
```

---

## 📚 Documentation

- **Démarrage rapide** : `QUICK-START.md`
- **Guide complet** : `README-INITIALISATION-COMPLETE.md`
- **Ce fichier** : Vue d'ensemble de tous les scripts

---

**Dernière mise à jour** : Novembre 2025






