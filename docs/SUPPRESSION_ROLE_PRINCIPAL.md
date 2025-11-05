# Suppression du Concept de Rôle Principal - EB Vision 2.0

## 📋 Vue d'ensemble

Modifications apportées pour **éliminer complètement** l'ancien système de rôle unique (champ `users.role`) et utiliser **exclusivement** le système de rôles multiples via la table `user_roles`.

**Date :** 3 octobre 2025  
**Version :** 2.0

---

## 🎯 Objectif

- ❌ **Supprimer** : La dépendance au champ `users.role` (rôle principal/legacy)
- ✅ **Adopter** : Uniquement le système de rôles multiples via `user_roles`
- 🔄 **Modifier** : JWT tokens pour inclure `roles` (array) au lieu de `role` (string)

---

## 🔧 Modifications Apportées

### 1. **Modèle User (`src/models/User.js`)**

#### Avant
```javascript
static async create(userData) {
    const { nom, prenom, email, password, login, role, roles } = userData;
    
    // Utiliser le premier rôle comme rôle principal pour la compatibilité
    const primaryRole = roles && roles.length > 0 ? roles[0] : role;
    
    const sql = `
        INSERT INTO users (nom, prenom, email, password_hash, login, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, nom, prenom, email, login, role, statut, created_at
    `;
    
    const result = await query(sql, [
        nom, prenom, email, passwordHash, userLogin, primaryRole
    ]);
    
    // Ajouter les rôles multiples si fournis
    if (roles && roles.length > 0) {
        await this.addMultipleRoles(newUser.id, roles);
    }
}
```

#### Après
```javascript
static async create(userData) {
    const { nom, prenom, email, password, login, roles } = userData;
    
    // Validation : au moins un rôle doit être fourni
    if (!roles || roles.length === 0) {
        throw new Error('Au moins un rôle doit être fourni');
    }
    
    // Créer l'utilisateur SANS rôle principal
    const sql = `
        INSERT INTO users (nom, prenom, email, password_hash, login)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, nom, prenom, email, login, statut, created_at
    `;
    
    const result = await query(sql, [
        nom, prenom, email, passwordHash, userLogin
    ]);
    
    // Ajouter les rôles via la table user_roles (OBLIGATOIRE)
    await this.addMultipleRoles(newUser.id, roles);
}
```

**Changements :**
- ❌ Suppression du paramètre `role` (rôle unique)
- ✅ Paramètre `roles` (array) devient **obligatoire**
- ❌ Suppression de l'insertion du champ `users.role`
- ✅ Validation : au moins un rôle doit être fourni
- ✅ Rôles stockés **uniquement** dans `user_roles`

---

### 2. **Route de Login (`src/routes/auth.js`)**

#### Avant
```javascript
const token = jwt.sign(
    {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role, // Rôle unique
        permissions: ['users:read', 'users:create', 'users:update', 'users:delete']
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
);
```

#### Après
```javascript
// Récupérer les rôles multiples de l'utilisateur
const userRolesData = await User.getRoles(user.id);
const userRoles = userRolesData.map(r => r.name); // ['SUPER_ADMIN', 'ADMIN', ...]

console.log(`👤 Connexion de ${user.email} avec les rôles:`, userRoles);

const token = jwt.sign(
    {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        roles: userRoles, // Array de rôles
        permissions: ['users:read', 'users:create', 'users:update', 'users:delete']
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
);
```

**Changements :**
- ✅ Récupération des rôles depuis `user_roles` lors du login
- ✅ Token JWT contient `roles: ['ADMIN', 'MANAGER']` au lieu de `role: 'ADMIN'`
- ✅ Logging des rôles pour debugging

---

### 3. **Middleware d'Authentification (`src/middleware/auth.js`)**

#### Avant
```javascript
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            nom: user.nom,
            prenom: user.prenom,
            role: user.role, // Rôle unique
            permissions: user.permissions || [...]
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};
```

#### Après
```javascript
const generateToken = (user, userRoles = []) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            nom: user.nom,
            prenom: user.prenom,
            roles: userRoles, // Array de rôles
            permissions: user.permissions || [...]
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};
```

**Changements :**
- ✅ Paramètre `userRoles` ajouté à `generateToken()`
- ✅ Token contient `roles` (array) au lieu de `role` (string)

---

### 4. **Middleware de Permissions (`src/middleware/auth.js`)**

#### Avant
```javascript
const userRole = req.user.role || req.user.grade || '';
```

#### Après
```javascript
const userRoles = req.user.roles || []; // Array de rôles
```

**Changements :**
- ✅ `req.user.roles` est maintenant un array
- ✅ Compatibilité avec les vérifications de rôles multiples

---

## 🔐 Sécurité et Validations

### Création d'utilisateur

```javascript
// ❌ AVANT : Acceptait role OU roles
if (!value.roles && !value.role) {
    throw new Error('Au moins un rôle doit être fourni');
}

// ✅ MAINTENANT : Rôles multiples obligatoires
if (!roles || roles.length === 0) {
    throw new Error('Au moins un rôle doit être fourni');
}
```

### Token JWT

```javascript
// ❌ AVANT
{
    id: "uuid",
    email: "user@example.com",
    role: "ADMIN" // String
}

// ✅ MAINTENANT
{
    id: "uuid",
    email: "user@example.com",
    roles: ["ADMIN", "MANAGER"] // Array
}
```

---

## 📊 Structure de Données

### Ancien Système (Hybride)
```
users
├─ role: "ADMIN" (principal/legacy)
└─ id
     └─ user_roles
           ├─ ADMIN
           └─ MANAGER
```

### Nouveau Système (Pure Rôles Multiples)
```
users
├─ id
└─ user_roles (SEULE source de vérité)
      ├─ ADMIN
      └─ MANAGER
```

---

## 🚀 Impact sur le Frontend

### Accès aux rôles

#### Avant
```javascript
// Token JWT
const role = user.role; // String
if (role === 'ADMIN') { ... }
```

#### Après
```javascript
// Token JWT
const roles = user.roles; // Array
if (roles.includes('ADMIN')) { ... }

// Vérifier plusieurs rôles
if (roles.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r))) { ... }
```

### Affichage

#### Avant
```javascript
<span>Rôle: ${user.role}</span>
```

#### Après
```javascript
<span>Rôles: ${user.roles.join(', ')}</span>
```

---

## 🧪 Tests Recommandés

### 1. Test de Création d'Utilisateur

```javascript
// ✅ Devrait réussir
const userData = {
    nom: "Dupont",
    prenom: "Jean",
    email: "jean@example.com",
    password: "password123",
    roles: ["admin-uuid", "manager-uuid"] // Array obligatoire
};

// ❌ Devrait échouer
const invalidData = {
    nom: "Dupont",
    prenom: "Jean",
    email: "jean@example.com",
    password: "password123",
    // Pas de roles !
};
```

### 2. Test de Login

```javascript
// Vérifier que le token contient roles (array)
const decoded = jwt.decode(token);
console.log(decoded.roles); // ['ADMIN', 'MANAGER']
```

### 3. Test de Permissions

```javascript
// Vérifier qu'un utilisateur avec plusieurs rôles a accès
if (req.user.roles.includes('ADMIN') || req.user.roles.includes('SUPER_ADMIN')) {
    // Autoriser l'accès
}
```

---

## ⚠️ Points d'Attention

### 1. **Migration des Utilisateurs Existants**

Les utilisateurs existants peuvent avoir un `users.role` rempli mais pas d'entrées dans `user_roles`.

**Solution :** Script de migration nécessaire (à créer) :
```sql
-- Pour chaque utilisateur avec un role mais sans entrée dans user_roles
INSERT INTO user_roles (user_id, role_id, created_at)
SELECT u.id, r.id, NOW()
FROM users u
JOIN roles r ON r.name = u.role
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
);
```

### 2. **Dépendances dans le Code**

Rechercher et remplacer toutes les références à `user.role` par `user.roles` :

```bash
# Trouver toutes les utilisations
grep -r "user\.role\|req\.user\.role" src/
```

### 3. **Compatibilité Rétrograde**

La route `/auth/me` retourne **à la fois** `role` (legacy) et `roles` (nouveau) pour compatibilité :

```javascript
{
    role: user.role, // Legacy (peut être null ou déprécié)
    roles: userRoles // Nouveau système (source de vérité)
}
```

---

## 📝 Checklist de Migration

- [x] Modifier `User.create()` pour supprimer le rôle principal
- [x] Mettre à jour la route `/login` pour récupérer les rôles multiples
- [x] Modifier `generateToken()` pour inclure `roles` (array)
- [x] Mettre à jour les middlewares pour utiliser `req.user.roles`
- [ ] Créer un script de migration pour les utilisateurs existants
- [ ] Mettre à jour le frontend pour utiliser `user.roles` partout
- [ ] Tester la création d'utilisateurs
- [ ] Tester le login et la génération de tokens
- [ ] Tester les permissions avec rôles multiples
- [ ] Déprécier/supprimer le champ `users.role` de la base de données

---

## 🎯 Prochaines Étapes

1. **Script de Migration** : Créer un script pour migrer les utilisateurs existants
2. **Frontend** : Mettre à jour tous les composants pour utiliser `user.roles`
3. **Tests** : Ajouter des tests automatisés pour les rôles multiples
4. **Documentation** : Mettre à jour la documentation API
5. **Dépréciation** : Marquer le champ `users.role` comme déprécié
6. **Suppression** : Supprimer complètement `users.role` dans une version future

---

## 📚 Ressources

- [Système de Rôles Multiples](./SYSTÈME_RÔLES_MULTIPLES.md)
- [Documentation API](./API.md)
- [Guide de Migration](./MIGRATION_GUIDE.md)

---

**Auteur :** EB Vision 2.0 Team  
**Date de dernière modification :** 3 octobre 2025












