# 🔒 Restrictions de Sécurité - Rôle SUPER_ADMIN

Ce document décrit les mesures de sécurité appliquées pour protéger le rôle `SUPER_ADMIN` et ses privilèges.

## 📋 Vue d'ensemble

Seul un utilisateur avec le rôle `SUPER_ADMIN` peut :
1. Voir et gérer d'autres comptes `SUPER_ADMIN`
2. Attribuer le rôle `SUPER_ADMIN` à d'autres utilisateurs
3. Gérer les permissions sensibles (gestion des permissions et menu PARAMÈTRES ADMINISTRATION)

## 🔐 Restrictions Implémentées

### 1. Visibilité du Rôle SUPER_ADMIN

#### **Backend**
- **`/api/permissions/roles`** (`src/routes/permissions.js`)
  - Filtre le rôle `SUPER_ADMIN` de la liste pour les non-super-admins
  
- **`/api/users/roles`** (`src/routes/users.js`)
  - Filtre le rôle `SUPER_ADMIN` de la liste pour les non-super-admins

#### **Impact**
- Les admins réguliers ne voient pas `SUPER_ADMIN` dans :
  - La liste des rôles sur `/permissions-admin.html`
  - Les modales de création/modification d'utilisateurs
  - Les sélecteurs de rôles dans toute l'application

---

### 2. Visibilité des Utilisateurs SUPER_ADMIN

#### **Backend**
- **`/api/permissions/users`** (`src/routes/permissions.js`)
  ```sql
  WHERE u.id NOT IN (
      SELECT DISTINCT ur.user_id
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name = 'SUPER_ADMIN'
  )
  AND u.role != 'SUPER_ADMIN'
  ```

- **`/api/users`** (`src/routes/users.js` + `src/models/User.js`)
  ```sql
  -- Même logique de filtrage appliquée dans User.findAll()
  ```

#### **Impact**
- Les admins réguliers ne voient pas les utilisateurs `SUPER_ADMIN` dans :
  - La page `/permissions-admin.html` (onglet "Rôles Utilisateurs" et "Accès Business Unit")
  - La page `/users.html`
  - Toute liste d'utilisateurs

---

### 3. Protection des Permissions Sensibles

#### **Backend**
- **`/api/permissions/roles/:id/permissions`** (`src/routes/permissions.js`)
  ```sql
  WHERE p.code NOT LIKE 'permissions.%'
  AND p.code NOT LIKE 'menu.parametres_administration%'
  ```

#### **Permissions Protégées**
- **`permissions.*`** : Toutes les permissions de gestion des permissions
  - `permissions:create`
  - `permissions:read`
  - `permissions:update`
  - `permissions:delete`
  - `permissions:assign`
  
- **`menu.parametres_administration%`** : Accès et sous-menus du menu PARAMÈTRES ADMINISTRATION
  - `menu.parametres_administration`
  - `menu.parametres_administration.permissions`
  - `menu.parametres_administration.roles`
  - `menu.parametres_administration.utilisateurs`
  - etc.

#### **Impact**
- Les admins réguliers ne peuvent pas :
  - Voir ces permissions dans l'onglet "Rôles et Permissions"
  - Attribuer ces permissions à d'autres rôles
  - Modifier les permissions d'un rôle pour inclure ces permissions sensibles

---

## 🔄 Logique de Vérification

### Fonction de Vérification
```javascript
// Vérifier si l'utilisateur connecté est SUPER_ADMIN
const userRolesResult = await client.query(`
    SELECT r.name
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = $1
`, [req.user.id]);

const userRoles = userRolesResult.rows.map(r => r.name);
const isSuperAdmin = userRoles.includes('SUPER_ADMIN') || req.user.role === 'SUPER_ADMIN';
```

### Points d'Application
1. **Routes de permissions** (`src/routes/permissions.js`)
   - GET `/api/permissions/roles`
   - GET `/api/permissions/users`
   - GET `/api/permissions/roles/:id/permissions`

2. **Routes d'utilisateurs** (`src/routes/users.js`)
   - GET `/api/users/roles`

3. **Modèle User** (`src/models/User.js`)
   - `User.findAll(options)` - ajout du paramètre `currentUserId`

---

## ✅ Pages Concernées

### `/permissions-admin.html`
- **Onglet "Rôles et Permissions"**
  - Les rôles et permissions sensibles ne sont visibles que pour les SUPER_ADMIN
  
- **Onglet "Rôles Utilisateurs"**
  - Le rôle `SUPER_ADMIN` n'apparaît pas dans la liste pour les non-super-admins
  - Les utilisateurs ayant le rôle `SUPER_ADMIN` ne sont pas visibles
  
- **Onglet "Accès Business Unit"**
  - Les utilisateurs `SUPER_ADMIN` ne sont pas dans la liste

### `/users.html`
- Les utilisateurs avec le rôle `SUPER_ADMIN` ne sont pas visibles pour les non-super-admins
- Le rôle `SUPER_ADMIN` n'apparaît pas dans le sélecteur de rôles lors de la création/modification

---

## 🛡️ Sécurité Renforcée

### Niveaux de Protection
1. **Niveau Base de Données** : Les requêtes SQL filtrent directement les données sensibles
2. **Niveau Backend** : Validation du rôle à chaque requête
3. **Niveau Frontend** : Masquage des éléments sensibles (à implémenter si nécessaire)

### Double Vérification
Le système vérifie à la fois :
- Les rôles multiples (table `user_roles`)
- Le rôle principal (colonne `users.role` - legacy)

Cela assure la compatibilité avec l'ancien système et le nouveau système de rôles multiples.

---

## 📊 Tableau Récapitulatif

| Élément | Visible pour SUPER_ADMIN | Visible pour Autres Admins |
|---------|--------------------------|----------------------------|
| Rôle SUPER_ADMIN | ✅ Oui | ❌ Non |
| Utilisateurs SUPER_ADMIN | ✅ Oui | ❌ Non |
| Permissions `permissions.*` | ✅ Oui | ❌ Non |
| Permissions `menu.parametres_administration%` | ✅ Oui | ❌ Non |
| Attribution rôle SUPER_ADMIN | ✅ Oui | ❌ Non |
| Modification utilisateur SUPER_ADMIN | ✅ Oui | ❌ Non |

---

## 🔍 Tests Recommandés

### Scénarios de Test

1. **En tant qu'ADMIN régulier** :
   - ✅ Je NE DOIS PAS voir le rôle SUPER_ADMIN dans les listes de rôles
   - ✅ Je NE DOIS PAS voir les utilisateurs SUPER_ADMIN
   - ✅ Je NE DOIS PAS voir les permissions `permissions.*` et `menu.parametres_administration%`
   - ✅ Je NE PEUX PAS attribuer le rôle SUPER_ADMIN

2. **En tant que SUPER_ADMIN** :
   - ✅ Je DOIS voir tous les rôles (incluant SUPER_ADMIN)
   - ✅ Je DOIS voir tous les utilisateurs (incluant SUPER_ADMIN)
   - ✅ Je DOIS voir toutes les permissions
   - ✅ Je PEUX attribuer n'importe quel rôle à n'importe quel utilisateur

---

## 📝 Notes Techniques

### Performances
- Les filtres ajoutent des sous-requêtes, mais l'impact est minimal car :
  - Les tables `user_roles` et `roles` sont indexées
  - Les requêtes sont mises en cache par PostgreSQL
  - Le nombre d'utilisateurs SUPER_ADMIN est généralement faible (1-5)

### Maintenance
- Si de nouvelles permissions sensibles sont ajoutées, mettre à jour les patterns de filtrage :
  - `permissions.%` pour les permissions de gestion
  - `menu.parametres_administration%` pour les sous-menus d'administration

---

## 🚀 Déploiement

### Fichiers Modifiés
1. `src/routes/permissions.js`
2. `src/routes/users.js`
3. `src/models/User.js`
4. `public/js/permissions-admin.js` (modifications précédentes)

### Aucune Migration Nécessaire
Les modifications sont uniquement applicatives, aucune modification de schéma de base de données n'est requise.

---

**Date de création** : 2 octobre 2025  
**Auteur** : Système EB-Vision 2.0  
**Version** : 1.0















