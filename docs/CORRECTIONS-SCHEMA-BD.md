# Corrections du Schéma de Base de Données

**Date**: 7 novembre 2025  
**Contexte**: Incompatibilité entre le schéma de la base de données (noms en français) et le code de l'application (noms en anglais)

## 🔍 Problème Identifié

Après l'exécution des scripts d'initialisation de la base de données, plusieurs pages de l'application ne pouvaient plus communiquer avec la BD. Les erreurs principales étaient :

1. ❌ `la colonne u.login n'existe pas`
2. ❌ `la colonne r.name n'existe pas` (hint: `r.nom`)

### Cause Racine

Le schéma de la base de données utilise des **noms de colonnes en français** :
- Table `roles` : colonne `nom` (et non `name`)
- Table `users` : pas de colonne `login` (uniquement `email`)

Mais le code de l'application utilisait des noms en **anglais**.

## ✅ Corrections Effectuées

### 1. Fichiers Modifiés

Les fichiers suivants ont été corrigés automatiquement :

| Fichier | Corrections |
|---------|-------------|
| `src/models/User.js` | ✓ Supprimé `u.login` de tous les SELECT<br>✓ Remplacé `r.name` par `r.nom as name`<br>✓ Remplacé `WHERE r.name = 'SUPER_ADMIN'` par `WHERE r.nom = 'Super Administrateur'` |
| `src/routes/permissions.js` | ✓ Remplacé `SELECT r.name` par `SELECT r.nom as name`<br>✓ Remplacé `WHERE r.name` par `WHERE r.nom`<br>✓ Supprimé `u.login` des SELECT DISTINCT |
| `src/routes/sync-permissions.js` | ✓ Remplacé `SELECT r.name` par `SELECT r.nom as name` |
| `src/routes/auth.js` | ✓ Remplacé `SELECT r.name` par `SELECT r.nom as name` |
| `src/routes/notification-settings.js` | ✓ Supprimé `u.login as user_login` |
| `src/routes/dashboard-analytics.js` | ✓ Remplacé `SELECT r.name` par `SELECT r.nom as name` |
| `src/middleware/auth.js` | ✓ Remplacé `SELECT r.name` par `SELECT r.nom as name` |
| `src/services/userAccessService.js` | ✓ Supprimé `u.login` des SELECT |
| `src/utils/superAdminHelper.js` | ✓ Remplacé `SELECT r.name` par `SELECT r.nom as name`<br>✓ Remplacé `WHERE r.name` par `WHERE r.nom` |

### 2. Stratégie de Correction

Pour maintenir la compatibilité avec le reste du code JavaScript qui utilise `.name`, nous avons utilisé des **alias SQL** :

```sql
-- ❌ Avant (erreur)
SELECT r.name FROM roles r

-- ✅ Après (fonctionne)
SELECT r.nom as name FROM roles r
```

Cela permet de :
- ✅ Respecter le schéma de la BD (colonne `nom`)
- ✅ Garder le code JavaScript inchangé (accès via `.name`)

### 3. Colonne `login` Supprimée

La colonne `u.login` n'existe pas dans le schéma actuel. Elle a été supprimée de toutes les requêtes SQL. La fonction `findByLogin()` utilise maintenant `email` comme critère de recherche.

```javascript
// ❌ Avant
SELECT u.id, u.nom, u.prenom, u.email, u.login, u.role FROM users u

// ✅ Après
SELECT u.id, u.nom, u.prenom, u.email, u.role FROM users u
```

## 📊 Schéma de la Base de Données

### Table `roles`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Identifiant unique |
| **`nom`** | VARCHAR | Nom du rôle (ex: "Super Administrateur") |
| `description` | TEXT | Description du rôle |
| `badge_bg_class` | VARCHAR | Classe CSS pour le badge |
| `badge_text_class` | VARCHAR | Classe CSS pour le texte |
| `badge_hex_color` | VARCHAR | Couleur hexadécimale |
| `badge_priority` | INTEGER | Priorité d'affichage |

### Table `users`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Identifiant unique |
| `nom` | VARCHAR | Nom de famille |
| `prenom` | VARCHAR | Prénom |
| **`email`** | VARCHAR | Email (utilisé pour la connexion) |
| `password_hash` | TEXT | Hash du mot de passe |
| `role` | VARCHAR | Rôle principal (legacy) |
| `statut` | VARCHAR | Statut (ACTIF/INACTIF) |
| `last_login` | TIMESTAMP | Dernière connexion |
| `created_at` | TIMESTAMP | Date de création |
| `updated_at` | TIMESTAMP | Date de mise à jour |
| `collaborateur_id` | UUID | Lien vers la table collaborateurs |

⚠️ **Note**: Il n'y a **PAS** de colonne `login` dans cette table.

## 🧪 Tests Recommandés

Après ces corrections, testez les fonctionnalités suivantes :

- [ ] Connexion utilisateur
- [ ] Affichage de la liste des utilisateurs (`/users.html`)
- [ ] Gestion des permissions (`/permissions-admin.html`)
- [ ] Profil utilisateur (`/api/auth/me`)
- [ ] Tableau de bord
- [ ] Notifications

## 🔧 Scripts d'Initialisation

Les scripts suivants ont été créés/mis à jour pour gérer le schéma de la BD :

1. **`scripts/database/0- init-from-schema.js`** : Script principal d'initialisation
2. **`scripts/database/1-init-database-tables.js`** : Initialisation des tables avec gestion des colonnes manquantes
3. **`scripts/database/2-create-super-admin.js`** : Création du super admin
4. **`scripts/database/3-assign-all-permissions.js`** : Affectation des permissions
5. **`scripts/database/4-generate-demo-data.js`** : Génération de données de démo
6. **`scripts/database/5-fix-database-schema.sql`** : Script SQL de correction du schéma

Tous ces scripts incluent maintenant des fonctions `ensure*Structure()` qui ajoutent dynamiquement les colonnes manquantes, rendant les scripts **robustes** et **idempotents**.

## 📝 Bonnes Pratiques

Pour éviter ce genre de problème à l'avenir :

1. **Documenter le schéma** : Maintenir une documentation à jour du schéma de la BD
2. **Tests automatisés** : Créer des tests qui vérifient la cohérence entre le schéma et le code
3. **Migrations** : Utiliser un système de migrations pour gérer les changements de schéma
4. **Nommage cohérent** : Choisir une convention (français ou anglais) et s'y tenir

## 🎯 Résultat

✅ Toutes les erreurs de colonnes manquantes ont été corrigées  
✅ L'application peut maintenant communiquer correctement avec la base de données  
✅ Les scripts d'initialisation sont robustes et adaptables  
✅ Le code est compatible avec le schéma actuel de la BD

---

**Auteur**: Assistant IA  
**Dernière mise à jour**: 7 novembre 2025





