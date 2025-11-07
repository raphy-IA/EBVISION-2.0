# Système de Rôles Multiples - EB Vision 2.0

## 📋 Vue d'ensemble

L'application EB Vision 2.0 utilise un système de **rôles multiples** qui permet à un utilisateur d'avoir plusieurs rôles simultanément. Ce système a remplacé l'ancien système de rôle unique.

## 🏗️ Architecture du système

### Tables de la base de données

#### 1. Table `users`
```sql
- id (UUID)
- nom
- prenom
- email
- password_hash
- login
- role (VARCHAR) -- Rôle principal (legacy, pour compatibilité)
- statut
- created_at
- updated_at
```

#### 2. Table `roles`
```sql
- id (UUID)
- name (VARCHAR) -- Ex: SUPER_ADMIN, ADMIN, MANAGER, etc.
- description (TEXT)
- created_at
- updated_at
```

#### 3. Table `user_roles` (Table de liaison)
```sql
- id (UUID)
- user_id (UUID) -- FK vers users.id
- role_id (UUID) -- FK vers roles.id
- created_at (TIMESTAMP)
```

### Relation entre les tables

```
users (1) ----< user_roles >---- (N) roles
```

Un utilisateur peut avoir plusieurs rôles via la table de liaison `user_roles`.

## 🔧 Implémentation

### Création d'un utilisateur avec rôles multiples

```javascript
// Données d'entrée
const userData = {
    nom: "Dupont",
    prenom: "Jean",
    email: "jean.dupont@example.com",
    password: "password123",
    roles: [
        "role-uuid-1",  // ID du rôle ADMIN
        "role-uuid-2"   // ID du rôle MANAGER
    ]
};

// Le modèle User.create() gère automatiquement :
// 1. Création de l'utilisateur avec le premier rôle comme rôle principal
// 2. Insertion des rôles dans user_roles via User.addMultipleRoles()
const newUser = await User.create(userData);
```

### Récupération des rôles d'un utilisateur

```javascript
// Récupérer tous les rôles d'un utilisateur
const userRoles = await User.getRoles(userId);
// Retourne : [
//   { id: "uuid-1", name: "ADMIN", description: "..." },
//   { id: "uuid-2", name: "MANAGER", description: "..." }
// ]
```

### Vérification de rôle

```javascript
// Vérifier si un utilisateur a un rôle spécifique
const hasRole = await User.hasRole(userId, "SUPER_ADMIN");
```

## 🛣️ Routes API

### ⚠️ IMPORTANT : Ordre des routes

Les routes doivent être définies dans cet ordre pour éviter les conflits :

```javascript
// ✅ BON ORDRE
router.get('/statistics', ...)     // Routes spécifiques d'abord
router.get('/roles', ...)           // Route /roles AVANT /:id
router.get('/:id', ...)             // Route paramétrique en dernier
router.get('/:id/roles', ...)       // Sous-routes après la route principale
```

```javascript
// ❌ MAUVAIS ORDRE (causera des erreurs)
router.get('/:id', ...)             // Si en premier, capturera /roles comme /:id
router.get('/roles', ...)           // Ne sera jamais atteint !
```

### Endpoints disponibles

#### 1. GET `/api/users/roles`
Récupère tous les rôles disponibles dans le système.

**Réponse :**
```json
{
    "success": true,
    "data": [
        {
            "id": "uuid-1",
            "name": "SUPER_ADMIN",
            "description": "Super administrateur - Accès total"
        },
        {
            "id": "uuid-2",
            "name": "ADMIN",
            "description": "Administrateur - Gestion métier"
        }
    ]
}
```

#### 2. GET `/api/users/:id/roles`
Récupère les rôles d'un utilisateur spécifique.

**Réponse :**
```json
{
    "success": true,
    "data": [
        {
            "id": "uuid-1",
            "name": "ADMIN",
            "description": "Administrateur"
        }
    ]
}
```

#### 3. POST `/api/users/:id/roles`
Ajoute un rôle à un utilisateur.

**Body :**
```json
{
    "roleId": "uuid-du-role"
}
```

#### 4. DELETE `/api/users/:id/roles/:roleId`
Retire un rôle d'un utilisateur.

## 🔒 Sécurité et Permissions

### Protection du rôle SUPER_ADMIN

Le système inclut des protections spéciales pour le rôle SUPER_ADMIN :

1. **Attribution restreinte** : Seul un SUPER_ADMIN peut attribuer le rôle SUPER_ADMIN à un autre utilisateur
2. **Suppression restreinte** : Impossible de supprimer le dernier SUPER_ADMIN du système
3. **Audit** : Toutes les actions liées au SUPER_ADMIN sont enregistrées dans `super_admin_audit_log`

### Système de permissions

Les permissions sont héritées des rôles :

```javascript
// Récupérer toutes les permissions d'un utilisateur
const permissions = await User.getPermissions(userId);
// Retourne : Permissions directes + Permissions des rôles
```

## 🐛 Problème résolu : Erreur UUID sur /roles

### Symptôme
```
❌ Erreur : syntaxe en entrée invalide pour le type uuid : « roles »
GET /api/users/roles => 500 Internal Server Error
```

### Cause
La route `GET /:id` était définie **AVANT** `GET /roles`, donc Express traitait "roles" comme un paramètre `:id` et essayait de le parser comme UUID.

### Solution
Réorganisation des routes dans `src/routes/users.js` :
- La route `/roles` a été déplacée **AVANT** la route `/:id`
- Ajout de commentaires explicatifs sur l'importance de l'ordre

## 📊 Migration de l'ancien système

### Ancien système (rôle unique)
```javascript
users.role = "ADMIN"  // Un seul rôle stocké dans users.role
```

### Nouveau système (rôles multiples)
```javascript
// Rôle principal stocké dans users.role (compatibilité)
users.role = "ADMIN"

// Rôles multiples dans user_roles
user_roles:
  - user_id + role_id => "ADMIN"
  - user_id + role_id => "MANAGER"
```

### Compatibilité

Le système maintient la compatibilité avec l'ancien système :
- Le champ `users.role` est conservé et contient le rôle "principal"
- Les nouveaux utilisateurs ont leur premier rôle comme rôle principal
- Les anciennes requêtes utilisant `users.role` fonctionnent toujours

## 🎯 Bonnes pratiques

1. **Toujours utiliser les rôles multiples** pour les nouvelles fonctionnalités
2. **Vérifier les permissions**, pas seulement les rôles
3. **Utiliser User.getRoles()** au lieu de lire directement `users.role`
4. **Respecter l'ordre des routes** dans les fichiers de routage
5. **Tester les rôles multiples** lors de la création/modification d'utilisateurs

## 📝 Exemple complet

```javascript
// 1. Récupérer tous les rôles disponibles
const allRoles = await fetch('/api/users/roles');

// 2. Créer un utilisateur avec plusieurs rôles
const newUser = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify({
        nom: "Dupont",
        prenom: "Jean",
        email: "jean.dupont@example.com",
        password: "password123",
        roles: ["admin-role-id", "manager-role-id"]
    })
});

// 3. Récupérer les rôles d'un utilisateur
const userRoles = await fetch(`/api/users/${userId}/roles`);

// 4. Ajouter un rôle à un utilisateur
await fetch(`/api/users/${userId}/roles`, {
    method: 'POST',
    body: JSON.stringify({ roleId: "new-role-id" })
});

// 5. Retirer un rôle d'un utilisateur
await fetch(`/api/users/${userId}/roles/${roleId}`, {
    method: 'DELETE'
});
```

## 🔍 Debugging

### Vérifier les rôles d'un utilisateur en base

```sql
SELECT u.nom, u.prenom, u.role as role_principal, r.name as role_multiple
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.id = 'user-uuid';
```

### Logs utiles

Le système inclut des logs détaillés :
```
🔄 Récupération des rôles...
📊 Table roles existe: true
📋 Récupération de tous les rôles...
✅ 12 rôles récupérés
```

---

**Date de création :** 3 octobre 2025  
**Version :** 1.0  
**Auteur :** Système EB Vision 2.0














