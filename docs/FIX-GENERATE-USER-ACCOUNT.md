# Correctif pour la génération de compte utilisateur

## Problème identifié

L'erreur `null value in column "role" of relation "users" violates not-null constraint` indique que :
1. Le code sur le serveur de production n'a pas été mis à jour
2. Les IDs de rôles envoyés sont des UUIDs alors que la table attend peut-être des entiers

## Corrections apportées

### 1. Correction du champ `role` (User.js)
- **Avant** : `VALUES ($1, $2, $3, $4, $5, NULL)`
- **Après** : `VALUES ($1, $2, $3, $4, $5, 'COLLABORATEUR')`

### 2. Support des types d'IDs de rôles (User.js)
- Ajout d'une conversion automatique pour supporter à la fois les entiers et les UUIDs

## Déploiement

Pour appliquer les corrections sur le serveur de production :

```bash
# 1. Se connecter au serveur
ssh raphyai82@148.230.80.83

# 2. Aller dans le répertoire de l'application
cd ~/apps/ewmanagement

# 3. Récupérer les dernières modifications
git pull origin main

# 4. Redémarrer l'application PM2
pm2 restart ewmanagement

# 5. Vérifier les logs
pm2 logs ewmanagement --lines 50
```

## Vérification du type d'IDs de rôles

Pour vérifier si la table `roles` utilise des entiers ou des UUIDs :

```sql
-- Sur le serveur de production
psql -U votre_user -d votre_database -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'id';"
```

Ou via Node.js :
```javascript
const result = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'id'");
console.log(result.rows);
```

## Si les IDs sont des UUIDs

Si la table `roles` utilise des UUIDs au lieu d'entiers (SERIAL), il faut :
1. Vérifier la structure de la table `user_roles`
2. S'assurer que `role_id` dans `user_roles` est de type UUID
3. Si nécessaire, adapter le code pour utiliser des UUIDs

## Test

Après le déploiement, testez la génération d'un compte utilisateur :
1. Allez sur `/collaborateurs.html`
2. Cliquez sur "Générer un compte utilisateur" pour un collaborateur
3. Sélectionnez au moins un rôle
4. Cliquez sur "Créer le compte"

Si l'erreur persiste, vérifiez les logs avec :
```bash
pm2 logs ewmanagement --err --lines 50
```

