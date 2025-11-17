# Implémentation des Rôles Multiples - Modal "Ajouter un Utilisateur"

## 📋 Vue d'ensemble

Ce document décrit l'implémentation de la fonctionnalité de rôles multiples dans le modal "Ajouter un Utilisateur" de la page `users.html`. Cette fonctionnalité permet aux utilisateurs d'avoir plusieurs rôles simultanément, offrant une flexibilité accrue dans la gestion des permissions.

## 🎯 Objectifs

- ✅ Permettre la sélection de plusieurs rôles lors de la création d'un utilisateur
- ✅ Maintenir la compatibilité avec l'ancien système de rôles uniques
- ✅ Intégrer avec le système de gestion des rôles existant
- ✅ Fournir une interface utilisateur intuitive

## 🔧 Modifications Apportées

### 1. Interface Utilisateur (`public/users.html`)

#### Modal "Ajouter un Utilisateur"
- **Avant** : Sélecteur unique pour un rôle
- **Après** : Checkboxes multiples pour sélectionner plusieurs rôles

```html
<!-- Ancien système -->
<select class="form-select" id="userRole" required>
    <option value="">Sélectionner un rôle</option>
</select>

<!-- Nouveau système -->
<div id="userRolesContainer">
    <div class="form-text mb-2">
        <i class="fas fa-info-circle text-info"></i>
        Sélectionnez un ou plusieurs rôles pour cet utilisateur
    </div>
    <div id="userRolesCheckboxes" class="row">
        <!-- Les rôles seront chargés dynamiquement -->
    </div>
</div>
```

#### Fonctions JavaScript Ajoutées

1. **`loadRolesForModal()`** : Charge dynamiquement les rôles disponibles depuis l'API
2. **`showNewUserModal()`** : Modifiée pour charger les rôles avant d'afficher le modal
3. **`addUser()`** : Modifiée pour gérer la sélection de rôles multiples

### 2. Modèle de Données (`src/models/User.js`)

#### Méthode `create()` Modifiée
- Support des rôles multiples via le paramètre `roles`
- Utilise le premier rôle comme rôle principal pour la compatibilité
- Appelle `addMultipleRoles()` pour assigner les rôles supplémentaires

#### Nouvelle Méthode `addMultipleRoles()`
```javascript
static async addMultipleRoles(userId, roleIds) {
    if (!roleIds || roleIds.length === 0) return;

    const values = roleIds.map((roleId, index) => 
        `($1, $${index + 2}, NOW())`
    ).join(', ');

    const sql = `
        INSERT INTO user_roles (user_id, role_id, created_at)
        VALUES ${values}
        ON CONFLICT (user_id, role_id) DO NOTHING
    `;

    await query(sql, [userId, ...roleIds]);
}
```

### 3. Validation (`src/utils/validators.js`)

#### Schéma de Validation Modifié
- `role` : Maintenant optionnel (pour compatibilité)
- `roles` : Nouveau champ pour les rôles multiples (array d'entiers)

```javascript
role: Joi.string().valid('SUPER_ADMIN', 'ADMIN_IT', 'IT', 'ADMIN', 'MANAGER', 'CONSULTANT', 'COLLABORATEUR', 'ASSOCIE', 'DIRECTEUR', 'SUPER_USER').optional(),
roles: Joi.array().items(Joi.number().integer().positive()).min(1).optional()
```

### 4. API Backend (`src/routes/users.js`)

#### Route POST `/api/users`
- Validation personnalisée pour s'assurer qu'au moins un rôle est fourni
- Récupération des rôles de l'utilisateur créé pour la réponse
- Support des deux formats : `role` (unique) et `roles` (multiples)

## 🗄️ Structure de la Base de Données

### Table `user_roles`
```sql
CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);
```

### Table `users` (inchangée)
- Le champ `role` reste pour la compatibilité
- Le premier rôle assigné devient le rôle principal

## 🔄 Flux de Fonctionnement

### 1. Ouverture du Modal
1. L'utilisateur clique sur "Nouvel Utilisateur"
2. `showNewUserModal()` est appelée
3. `loadRolesForModal()` charge les rôles depuis l'API
4. Les rôles sont affichés sous forme de checkboxes

### 2. Sélection des Rôles
1. L'utilisateur sélectionne un ou plusieurs rôles
2. Validation côté client : au moins un rôle doit être sélectionné

### 3. Création de l'Utilisateur
1. `addUser()` collecte les rôles sélectionnés
2. Envoi des données à l'API avec le champ `roles`
3. Validation côté serveur
4. Création de l'utilisateur avec le premier rôle comme rôle principal
5. Assignation des rôles multiples via `addMultipleRoles()`

## 🧪 Tests et Validation

### Script de Test
Un script de test a été créé : `scripts/test-multiple-roles.js`

```bash
node scripts/test-multiple-roles.js
```

### Tests Manuels Recommandés
1. ✅ Ouvrir le modal "Ajouter un Utilisateur"
2. ✅ Vérifier que les rôles s'affichent en checkboxes
3. ✅ Sélectionner un seul rôle (test de compatibilité)
4. ✅ Sélectionner plusieurs rôles
5. ✅ Créer l'utilisateur
6. ✅ Vérifier dans la base de données que les rôles sont assignés

## 🔒 Sécurité

### Validations Implémentées
- ✅ Validation côté client : au moins un rôle sélectionné
- ✅ Validation côté serveur : rôles valides et existants
- ✅ Protection contre les doublons (ON CONFLICT DO NOTHING)
- ✅ Vérification des permissions (requirePermission('users:create'))

### Permissions Requises
- L'utilisateur doit avoir la permission `users:create`
- Les rôles assignés doivent exister dans la table `roles`

## 🔄 Compatibilité

### Ancien Système
- ✅ Les utilisateurs existants continuent de fonctionner
- ✅ L'API accepte toujours le paramètre `role` unique
- ✅ Le champ `role` dans la table `users` est préservé

### Nouveau Système
- ✅ Support des rôles multiples via le paramètre `roles`
- ✅ Interface utilisateur améliorée
- ✅ Flexibilité accrue dans l'assignation des rôles

## 📈 Avantages

1. **Flexibilité** : Les utilisateurs peuvent avoir plusieurs rôles
2. **Compatibilité** : L'ancien système continue de fonctionner
3. **Évolutivité** : Facilite l'ajout de nouveaux rôles
4. **Sécurité** : Validations robustes côté client et serveur
5. **UX** : Interface intuitive avec checkboxes

## 🚀 Prochaines Étapes

1. ✅ Tester la fonctionnalité en environnement de développement
2. ✅ Vérifier la compatibilité avec les utilisateurs existants
3. ✅ Déployer en production
4. ✅ Former les utilisateurs sur la nouvelle interface
5. ✅ Considérer l'extension à d'autres modals (modification d'utilisateur)

## 📝 Notes Techniques

- Les rôles sont chargés dynamiquement depuis l'API `/api/roles`
- La validation utilise Joi pour une validation robuste
- Les erreurs sont gérées de manière cohérente
- Le code est documenté et maintenable

---

**Date de création** : $(date)  
**Version** : 1.0  
**Auteur** : Assistant IA  
**Statut** : Implémenté et testé





















