# 📋 Ordre d'Exécution des Scripts d'Initialisation

## 🚀 Méthode Automatique (Recommandée)

Pour initialiser la base de données en **une seule commande** :

```bash
node scripts/database/0-init-complete.js
```

Ce script exécute automatiquement toutes les étapes dans le bon ordre.

---

## 🔧 Méthode Manuelle (Scripts Individuels)

Si vous préférez exécuter les scripts un par un, voici l'**ordre obligatoire** :

### 1️⃣ **Initialisation des Tables** 
```bash
node scripts/database/1-init-database-tables.js
```
**Rôle :** Crée la structure de la base de données
- ✅ 81 tables créées
- ✅ 11 rôles système créés
- ✅ Contraintes et index configurés

**Dépendances :** Aucune (première étape)

---

### 2️⃣ **Création du Super Admin**
```bash
node scripts/database/2-create-super-admin.js
```
**Rôle :** Crée le compte administrateur principal
- ✅ 1 utilisateur Super Admin créé
- ✅ Rôle SUPER_ADMIN assigné
- ✅ Mot de passe hashé avec bcrypt

**Dépendances :** 
- ⚠️ Nécessite l'étape 1 (tables `users`, `roles`, `user_roles`)

---

### 3️⃣ **Insertion des Données de Référence**
```bash
node scripts/database/3-insert-reference-data.js
```
**Rôle :** Charge toutes les données de référence
- ✅ Types de collaborateurs, grades, postes
- ✅ Types de missions
- ✅ Pays, secteurs d'activité
- ✅ Sources d'entreprises + 100 entreprises réelles
- ✅ Années fiscales (N-1 et N)
- ✅ 10 types d'opportunités avec 27 étapes configurées
- ✅ Activités internes
- ✅ 5 tâches pour le type de mission Marketing

**Dépendances :** 
- ⚠️ Nécessite l'étape 1 (toutes les tables de référence)

---

### 4️⃣ **Synchronisation des Permissions**
```bash
node scripts/database/sync-all-permissions-complete.js
```
**Rôle :** Extrait et crée toutes les permissions depuis le code source
- ✅ Permissions fonctionnelles (depuis les routes API)
- ✅ Permissions de pages (depuis les fichiers HTML)
- ✅ Permissions de menu (depuis la sidebar)
- ✅ 321+ permissions créées

**Dépendances :** 
- ⚠️ Nécessite l'étape 1 (table `permissions`)

---

### 5️⃣ **Assignation des Permissions**
```bash
node scripts/database/4-assign-all-permissions.js
```
**Rôle :** Assigne toutes les permissions au Super Admin
- ✅ Toutes les permissions assignées au rôle SUPER_ADMIN
- ✅ Toutes les permissions assignées à l'utilisateur Super Admin

**Dépendances :** 
- ⚠️ Nécessite l'étape 2 (utilisateur Super Admin existe)
- ⚠️ Nécessite l'étape 4 (permissions créées)

---

## ⚠️ ORDRE CRITIQUE

**L'ordre DOIT être respecté :**

```
1-init-database-tables.js
         ↓
2-create-super-admin.js
         ↓
3-insert-reference-data.js
         ↓
sync-all-permissions-complete.js
         ↓
4-assign-all-permissions.js
```

**❌ NE PAS exécuter dans un autre ordre !**

---

## 🔄 Scripts Complémentaires (Optionnels)

### Ajouter des Tâches aux Types de Mission

```bash
# Exemple : Ajouter 5 tâches au type Marketing
node scripts/database/add-marketing-tasks.js
```

### Vérifier les Types de Mission et Tâches

```bash
node scripts/database/check-mission-tasks.js
```

### Vérifier les Données d'Opportunités

```bash
node scripts/database/verify-opportunity-data.js
```

### Extraire les Données du Backup SQL

```bash
node scripts/database/extract-backup-data.js
```

---

## 📊 Résultat Final

Après l'exécution complète, votre base de données contient :

| Élément | Quantité |
|---------|----------|
| **Tables** | 81 |
| **Rôles système** | 11 |
| **Super Admin** | 1 utilisateur |
| **Types de collaborateurs** | 4 |
| **Grades** | 6 |
| **Postes** | 6 |
| **Types de missions** | 7 |
| **Pays** | 29 |
| **Secteurs d'activité** | 25 |
| **Sources d'entreprises** | 5 |
| **Entreprises** | 100 |
| **Types d'opportunités** | 10 |
| **Étapes d'opportunités** | 27 |
| **Activités internes** | 4 |
| **Tâches de mission (Marketing)** | 5 |
| **Permissions** | 321+ |

---

## 🔑 Identifiants par Défaut

**Email :** `admin@ebvision.com`  
**Mot de passe :** `Admin@2025`

---

## 🆘 Dépannage

### Erreur "Table already exists"
➡️ La base de données n'est pas vide. Utilisez `0-init-complete.js` sur une base vide ou supprimez les tables existantes.

### Erreur "Role not found"
➡️ Vous avez sauté l'étape 1. Exécutez `1-init-database-tables.js` d'abord.

### Erreur "Permission not found"
➡️ Vous avez sauté l'étape 4. Exécutez `sync-all-permissions-complete.js` avant `4-assign-all-permissions.js`.

### Erreur de connexion PostgreSQL
➡️ Vérifiez votre fichier `.env` :
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ewm_db
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe
```

---

## 📚 Documentation Complète

Pour plus de détails sur chaque script, consultez les commentaires dans les fichiers sources.
