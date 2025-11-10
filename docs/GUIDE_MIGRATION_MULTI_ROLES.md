# Guide de Migration vers les Rôles Multiples

## 📋 Vue d'ensemble

Ce guide vous explique comment migrer les utilisateurs existants vers le nouveau système de rôles multiples.

**Date :** 3 octobre 2025  
**Version :** 1.0

---

## 🎯 Objectif

Migrer tous les utilisateurs qui ont un rôle défini dans `users.role` vers le nouveau système `user_roles` (rôles multiples).

---

## 📂 Fichiers de Migration

Deux fichiers ont été créés pour faciliter la migration :

1. **`migrations/006_migrate_users_to_multi_roles.sql`** - Script SQL de migration
2. **`scripts/migrate-to-multi-roles.js`** - Script Node.js pour exécuter la migration avec des statistiques

---

## 🚀 Méthode 1 : Script Node.js (Recommandé)

### Simulation (Dry Run)

Pour voir ce qui sera fait **SANS modifier** la base de données :

```bash
node scripts/migrate-to-multi-roles.js --dry-run
```

### Exécution Réelle

Pour exécuter la migration :

```bash
node scripts/migrate-to-multi-roles.js
```

Le script affichera :
- ✅ Statistiques avant migration
- 🚀 Progression de la migration
- 📊 Statistiques après migration
- 📝 Liste des utilisateurs migrés

---

## 🗄️ Méthode 2 : SQL Direct

### Via psql

```bash
psql -U postgres -d eb_vision_2_0 -f migrations/006_migrate_users_to_multi_roles.sql
```

### Via pgAdmin

1. Ouvrir pgAdmin
2. Se connecter à la base de données `eb_vision_2_0`
3. Ouvrir l'éditeur de requêtes
4. Copier le contenu de `migrations/006_migrate_users_to_multi_roles.sql`
5. Exécuter la requête

### Via DBeaver

1. Ouvrir DBeaver
2. Se connecter à la base de données `eb_vision_2_0`
3. Créer un nouveau script SQL
4. Copier le contenu de `migrations/006_migrate_users_to_multi_roles.sql`
5. Exécuter le script (Ctrl+Enter ou F5)

---

## 📊 Ce que fait la Migration

### Étapes de la Migration

1. **Création de la table `user_roles`** (si elle n'existe pas)
   ```sql
   CREATE TABLE IF NOT EXISTS user_roles (
       id UUID PRIMARY KEY,
       user_id UUID REFERENCES users(id),
       role_id UUID REFERENCES roles(id),
       created_at TIMESTAMP,
       UNIQUE(user_id, role_id)
   );
   ```

2. **Migration des utilisateurs actifs**
   - Pour chaque utilisateur actif avec un `users.role` défini
   - Recherche l'UUID du rôle dans la table `roles`
   - Crée une entrée dans `user_roles`
   - Ignore les utilisateurs qui ont déjà des rôles multiples

3. **Gestion des cas spéciaux**
   - Utilisateurs sans rôle défini → Avertissement
   - Rôles non trouvés dans la table `roles` → Erreur
   - Utilisateurs déjà migrés → Ignorés

4. **Statistiques finales**
   - Nombre d'utilisateurs migrés
   - Utilisateurs avec plusieurs rôles
   - Utilisateurs restants sans rôles

---

## 🔍 Vérifications Avant Migration

### 1. Vérifier les utilisateurs sans rôles multiples

```sql
SELECT u.id, u.nom, u.prenom, u.email, u.role
FROM users u
WHERE u.statut = 'ACTIF'
AND NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
);
```

### 2. Vérifier les rôles disponibles

```sql
SELECT id, name, description FROM roles ORDER BY name;
```

### 3. Compter les utilisateurs à migrer

```sql
SELECT COUNT(*) as users_to_migrate
FROM users u
WHERE u.statut = 'ACTIF'
AND u.role IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
);
```

---

## ✅ Vérifications Après Migration

### 1. Vérifier que tous les utilisateurs ont des rôles

```sql
SELECT COUNT(*) as users_without_roles
FROM users u
WHERE u.statut = 'ACTIF'
AND NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
);
```

**Résultat attendu :** `0`

### 2. Vérifier les statistiques

```sql
-- Utilisateurs avec rôles multiples
SELECT COUNT(DISTINCT user_id) as users_with_multi_roles
FROM user_roles;

-- Total d'assignations de rôles
SELECT COUNT(*) as total_role_assignments
FROM user_roles;

-- Utilisateurs avec plusieurs rôles
SELECT COUNT(*) as users_with_multiple_roles
FROM (
    SELECT user_id
    FROM user_roles
    GROUP BY user_id
    HAVING COUNT(*) > 1
) AS multi;
```

### 3. Vérifier un utilisateur spécifique

```sql
-- Remplacer USER_ID par l'ID de l'utilisateur
SELECT 
    u.nom,
    u.prenom,
    u.email,
    u.role as role_legacy,
    STRING_AGG(r.name, ', ') as roles_multiples
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.id = 'USER_ID'
GROUP BY u.id, u.nom, u.prenom, u.email, u.role;
```

---

## 🛠️ Fonctions Utilitaires

### Synchroniser manuellement un utilisateur

Si un utilisateur n'a pas été migré automatiquement :

```sql
SELECT sync_user_role_to_multi_roles('user-uuid-here');
```

### Ajouter manuellement un rôle à un utilisateur

```sql
INSERT INTO user_roles (user_id, role_id, created_at)
SELECT 
    'user-uuid-here',
    r.id,
    NOW()
FROM roles r
WHERE r.name = 'ADMIN';
```

---

## ⚠️ Cas Particuliers

### Utilisateurs sans rôle défini

Si des utilisateurs n'ont pas de `users.role` défini :

```sql
-- Lister les utilisateurs concernés
SELECT id, nom, prenom, email
FROM users
WHERE statut = 'ACTIF'
AND (role IS NULL OR role = '')
AND NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = users.id
);

-- Attribuer un rôle par défaut (ex: CONSULTANT)
INSERT INTO user_roles (user_id, role_id, created_at)
SELECT 
    u.id,
    r.id,
    NOW()
FROM users u
CROSS JOIN roles r
WHERE u.statut = 'ACTIF'
AND (u.role IS NULL OR u.role = '')
AND r.name = 'CONSULTANT'
AND NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
);
```

### Rôles non trouvés

Si un `users.role` n'existe pas dans la table `roles` :

```sql
-- Lister les rôles non trouvés
SELECT DISTINCT u.role
FROM users u
WHERE u.statut = 'ACTIF'
AND u.role IS NOT NULL
AND u.role NOT IN (SELECT name FROM roles)
AND NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
);

-- Créer les rôles manquants si nécessaire
INSERT INTO roles (id, name, description, created_at)
VALUES 
    (gen_random_uuid(), 'ROLE_MANQUANT', 'Description du rôle', NOW());
```

---

## 🔄 Rollback (Annulation)

Si vous devez annuler la migration :

```sql
-- Supprimer toutes les entrées user_roles créées par la migration
-- ⚠️ ATTENTION: Cela supprimera TOUS les rôles multiples !
TRUNCATE TABLE user_roles;

-- OU supprimer uniquement les rôles qui correspondent au users.role
DELETE FROM user_roles ur
WHERE EXISTS (
    SELECT 1 
    FROM users u
    JOIN roles r ON r.name = u.role
    WHERE u.id = ur.user_id
    AND r.id = ur.role_id
);
```

---

## 📝 Exemple Complet

### Avant Migration

```sql
-- Utilisateur avec un seul rôle
users:
  id: 'abc-123'
  nom: 'Dupont'
  prenom: 'Jean'
  role: 'ADMIN' ← Rôle legacy

user_roles:
  (vide pour cet utilisateur)
```

### Après Migration

```sql
-- Utilisateur avec rôle multiple
users:
  id: 'abc-123'
  nom: 'Dupont'
  prenom: 'Jean'
  role: 'ADMIN' ← Conservé pour compatibilité

user_roles:
  - user_id: 'abc-123'
    role_id: 'role-admin-uuid'
    created_at: NOW()
```

---

## 🎯 Prochaines Étapes

Après la migration :

1. ✅ Vérifier que tous les utilisateurs ont des rôles
2. ✅ Tester la connexion des utilisateurs
3. ✅ Vérifier que les permissions fonctionnent
4. 🔄 Mettre à jour le frontend pour utiliser `user.roles`
5. 📝 Documenter les changements pour l'équipe
6. 🗑️ (Futur) Supprimer le champ `users.role` quand tout fonctionne

---

## 🆘 Support

En cas de problème :

1. Consulter les logs du script de migration
2. Vérifier la base de données avec les requêtes de vérification
3. Utiliser la fonction `sync_user_role_to_multi_roles()` pour les cas particuliers
4. Consulter la documentation complète dans `SYSTÈME_RÔLES_MULTIPLES.md`

---

## 📚 Ressources

- [Système de Rôles Multiples](./SYSTÈME_RÔLES_MULTIPLES.md)
- [Suppression du Rôle Principal](./SUPPRESSION_ROLE_PRINCIPAL.md)
- [Documentation API](./API.md)

---

**Auteur :** EB Vision 2.0 Team  
**Date :** 3 octobre 2025



















