# Migration vers le Système de Rôles Multiples - EB Vision 2.0

## 🎯 Résumé des Modifications

Le système de rôles de l'application a été **entièrement revu** pour utiliser exclusivement le système de **rôles multiples**. Le concept de "rôle principal" (champ `users.role`) a été supprimé.

---

## ✅ Ce qui a été fait

### 1. **Modifications du Code Backend**

#### `src/models/User.js`
- ❌ Suppression de l'insertion du champ `users.role` lors de la création
- ✅ Le paramètre `roles` (array) est maintenant obligatoire
- ✅ Validation stricte : au moins un rôle doit être fourni
- ✅ Rôles stockés uniquement dans `user_roles`

#### `src/routes/auth.js`
- ✅ Récupération automatique des rôles depuis `user_roles` lors du login
- ✅ Token JWT contient `roles: ['ADMIN', 'MANAGER']` au lieu de `role: 'ADMIN'`
- ✅ Logging des rôles pour faciliter le debugging

#### `src/middleware/auth.js`
- ✅ `generateToken()` accepte un array de rôles
- ✅ `requirePermission()` utilise `req.user.roles` (array)

### 2. **Scripts de Migration**

#### `migrations/006_migrate_users_to_multi_roles.sql`
Script SQL complet qui :
- Crée la table `user_roles` si elle n'existe pas
- Migre automatiquement tous les utilisateurs actifs
- Gère les cas spéciaux (utilisateurs sans rôles, rôles non trouvés)
- Fournit des statistiques détaillées
- Crée une fonction `sync_user_role_to_multi_roles()` pour synchronisation manuelle

#### `scripts/migrate-to-multi-roles.js`
Script Node.js interactif qui :
- Vérifie les prérequis
- Affiche les statistiques avant/après
- Support du mode `--dry-run` pour simulation
- Affiche des logs colorés et détaillés
- Liste les utilisateurs non migrés

### 3. **Documentation Complète**

#### `docs/SYSTÈME_RÔLES_MULTIPLES.md`
- Architecture complète du système
- Explication de la migration ancien → nouveau
- Bonnes pratiques et exemples
- Guide de debugging

#### `docs/SUPPRESSION_ROLE_PRINCIPAL.md`
- Détails de toutes les modifications apportées
- Comparaison avant/après
- Impact sur le frontend
- Checklist de migration

#### `docs/GUIDE_MIGRATION_MULTI_ROLES.md`
- Instructions pas à pas pour exécuter la migration
- Méthodes SQL et Node.js
- Vérifications avant/après
- Gestion des cas particuliers
- Requêtes SQL utilitaires

---

## 🚀 Comment Migrer

### Option 1 : Script Node.js (Recommandé)

```bash
# Simulation sans modifications
node scripts/migrate-to-multi-roles.js --dry-run

# Exécution réelle
node scripts/migrate-to-multi-roles.js
```

### Option 2 : SQL Direct

```bash
# Via psql
psql -U postgres -d eb_vision_2_0 -f migrations/006_migrate_users_to_multi_roles.sql

# Via votre outil SQL préféré (pgAdmin, DBeaver, etc.)
# Copier le contenu de migrations/006_migrate_users_to_multi_roles.sql
# et l'exécuter
```

---

## 📊 Structure des Données

### ❌ AVANT (Système Hybride)
```
users
├─ role: "ADMIN" ← Rôle principal (legacy)
└─ id
     └─ user_roles
           ├─ ADMIN
           └─ MANAGER
```

### ✅ APRÈS (Pure Rôles Multiples)
```
users
├─ id
└─ user_roles ← SEULE source de vérité
      ├─ ADMIN
      └─ MANAGER
```

---

## 🔐 Token JWT

### ❌ AVANT
```json
{
    "id": "uuid",
    "email": "user@example.com",
    "role": "ADMIN"
}
```

### ✅ APRÈS
```json
{
    "id": "uuid",
    "email": "user@example.com",
    "roles": ["ADMIN", "MANAGER"]
}
```

---

## 💻 Impact sur le Frontend

### Modifications Nécessaires

```javascript
// ❌ AVANT
if (user.role === 'ADMIN') {
    // ...
}

// ✅ APRÈS
if (user.roles.includes('ADMIN')) {
    // ...
}

// Vérifier plusieurs rôles
if (user.roles.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r))) {
    // ...
}
```

### Affichage

```javascript
// ❌ AVANT
<span>Rôle: ${user.role}</span>

// ✅ APRÈS
<span>Rôles: ${user.roles.join(', ')}</span>
```

---

## 🧪 Vérifications

### Après Migration

```sql
-- Vérifier qu'il n'y a pas d'utilisateurs actifs sans rôles
SELECT COUNT(*) as users_without_roles
FROM users u
WHERE u.statut = 'ACTIF'
AND NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
);
-- Résultat attendu: 0

-- Statistiques des rôles
SELECT COUNT(DISTINCT user_id) as users_with_roles,
       COUNT(*) as total_role_assignments
FROM user_roles;
```

### Test de Login

```javascript
// Le token doit contenir roles (array)
const decoded = jwt.decode(token);
console.log(decoded.roles); // ['ADMIN', 'MANAGER']
```

---

## ⚠️ Points d'Attention

1. **Serveur à Redémarrer**
   - Les modifications nécessitent un redémarrage du serveur Node.js
   - Les tokens existants doivent être régénérés (reconnecter les utilisateurs)

2. **Frontend à Mettre à Jour**
   - Tous les composants utilisant `user.role` doivent être modifiés
   - Utiliser `user.roles` (array) partout

3. **Migration des Données**
   - Exécuter le script de migration pour les utilisateurs existants
   - Vérifier que tous les utilisateurs ont des rôles

4. **Compatibilité**
   - Le champ `users.role` est conservé temporairement
   - La route `/auth/me` retourne les deux pour compatibilité
   - Il pourra être supprimé dans une version future

---

## 📝 Checklist de Déploiement

- [x] Modifications du code backend
- [x] Scripts de migration créés
- [x] Documentation complète
- [ ] **Serveur redémarré**
- [ ] **Migration des utilisateurs exécutée**
- [ ] **Tests de connexion effectués**
- [ ] Frontend mis à jour
- [ ] Tests end-to-end
- [ ] Déploiement en production

---

## 📚 Documentation

- **[Système de Rôles Multiples](docs/SYSTÈME_RÔLES_MULTIPLES.md)** - Architecture et fonctionnement
- **[Suppression du Rôle Principal](docs/SUPPRESSION_ROLE_PRINCIPAL.md)** - Détails des modifications
- **[Guide de Migration](docs/GUIDE_MIGRATION_MULTI_ROLES.md)** - Instructions pas à pas

---

## 🆘 En cas de Problème

1. **Le serveur ne démarre pas**
   - Vérifier les logs: `npm start`
   - Vérifier la syntaxe des fichiers modifiés
   - Vérifier la connexion à la base de données

2. **Les utilisateurs ne peuvent pas se connecter**
   - Vérifier que la migration a été exécutée
   - Vérifier que tous les utilisateurs ont des rôles dans `user_roles`
   - Regarder les logs du serveur lors du login

3. **Erreurs de permissions**
   - Vérifier que `req.user.roles` existe dans le token
   - Vérifier la logique de vérification des permissions
   - Consulter les logs du middleware d'authentification

---

## 🎯 Prochaines Étapes

1. ✅ **Redémarrer le serveur**
2. ✅ **Exécuter la migration des utilisateurs**
3. 🔄 **Tester les connexions**
4. 🔄 **Mettre à jour le frontend**
5. 🔄 **Tests complets**
6. 🔄 **Déploiement en production**

---

**Date :** 3 octobre 2025  
**Version :** 2.0  
**Auteur :** EB Vision 2.0 Team

---

## 📞 Support

Pour toute question ou problème, consulter la documentation complète ou contacter l'équipe de développement.


