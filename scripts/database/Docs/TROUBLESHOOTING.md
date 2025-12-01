# 🔧 Dépannage des Scripts d'Initialisation

## ❌ Erreur: "Cannot find module 'D:\10.'"

### Symptôme
```
Error: Cannot find module 'D:\10.'
    at Function._resolveFilename (node:internal/modules/cjs/loader:1401:15)
```

### Cause
Le chemin du projet contient des **espaces** (ex: `D:\10. Programmation\Projets\EB-Vision 2.0`), et l'ancienne version du script utilisait `spawn()` qui ne gérait pas correctement les chemins avec espaces sous Windows.

### Solution ✅
**Corrigé dans la version actuelle** : Le script `0-init-complete.js` utilise maintenant `fork()` au lieu de `spawn()`, ce qui gère correctement les chemins avec espaces.

**Si vous avez encore cette erreur**, assurez-vous d'avoir la dernière version du script.

---

## ❌ Erreur: "Connection refused" ou "ECONNREFUSED"

### Symptôme
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

### Cause
PostgreSQL n'est pas démarré ou n'écoute pas sur le port configuré.

### Solution ✅
1. **Vérifier que PostgreSQL est démarré** :
   ```bash
   # Windows (Services)
   services.msc
   # Chercher "PostgreSQL" et démarrer le service
   ```

2. **Vérifier le port dans `.env`** :
   ```env
   DB_PORT=5432
   ```

3. **Tester la connexion** :
   ```bash
   psql -U postgres -h localhost -p 5432
   ```

---

## ❌ Erreur: "password authentication failed"

### Symptôme
```
error: password authentication failed for user "postgres"
```

### Cause
Le mot de passe dans le fichier `.env` est incorrect.

### Solution ✅
1. **Vérifier le fichier `.env`** :
   ```env
   DB_USER=postgres
   DB_PASSWORD=votre_mot_de_passe_correct
   ```

2. **Tester avec psql** :
   ```bash
   psql -U postgres -h localhost
   # Entrer le mot de passe pour vérifier
   ```

---

## ❌ Erreur: "database does not exist"

### Symptôme
```
error: database "ewm_db" does not exist
```

### Cause
La base de données n'a pas été créée.

### Solution ✅
Le script `1-init-database-tables.js` vous propose de créer la base. Choisissez l'option **"Créer une nouvelle base de données"** lors de l'exécution.

Ou créez-la manuellement :
```sql
CREATE DATABASE ewm_db;
```

---

## ❌ Erreur: "relation already exists"

### Symptôme
```
error: relation "users" already exists
```

### Cause
Vous essayez de réinitialiser une base qui contient déjà des tables.

### Solution ✅
**Option 1 : Utiliser le script de reset**
```bash
node scripts/database/0-reset-database.js
# Choisir le niveau de réinitialisation approprié
```

**Option 2 : Supprimer et recréer la base**
```sql
DROP DATABASE ewm_db;
CREATE DATABASE ewm_db;
```

---

## ❌ Erreur: "permission denied"

### Symptôme
```
error: permission denied for schema public
```

### Cause
L'utilisateur PostgreSQL n'a pas les permissions nécessaires.

### Solution ✅
```sql
-- Se connecter en tant que superuser
GRANT ALL PRIVILEGES ON DATABASE ewm_db TO postgres;
GRANT ALL ON SCHEMA public TO postgres;
```

---

## ❌ Le script s'arrête sans erreur

### Symptôme
Le script s'arrête brusquement sans message d'erreur.

### Cause
Possible timeout ou problème de mémoire.

### Solution ✅
1. **Augmenter la mémoire Node.js** :
   ```bash
   node --max-old-space-size=4096 scripts/database/0-init-complete.js
   ```

2. **Exécuter les scripts individuellement** pour identifier le problème :
   ```bash
   node scripts/database/1-init-database-tables.js
   node scripts/database/2-create-super-admin.js
   # etc.
   ```

---

## ❌ Erreur: "inquirer" module not found

### Symptôme
```
Error: Cannot find module 'inquirer'
```

### Cause
Les dépendances npm ne sont pas installées.

### Solution ✅
```bash
npm install
```

---

## ❌ Erreur lors de la synchronisation des permissions

### Symptôme
```
Error: ENOENT: no such file or directory, scandir 'public'
```

### Cause
Le script `sync-all-permissions-complete.js` ne trouve pas les dossiers source.

### Solution ✅
Assurez-vous d'exécuter le script depuis la **racine du projet** :
```bash
# Bon ✅
node scripts/database/sync-all-permissions-complete.js

# Mauvais ❌
cd scripts/database
node sync-all-permissions-complete.js
```

---

## ❌ Les données de référence ne se chargent pas

### Symptôme
Le script `3-insert-reference-data.js` se termine mais les données ne sont pas dans la base.

### Cause
Possible erreur silencieuse ou transaction rollback.

### Solution ✅
1. **Vérifier les logs du script** pour voir les messages de succès

2. **Vérifier manuellement dans la base** :
   ```sql
   SELECT COUNT(*) FROM pays;
   SELECT COUNT(*) FROM secteurs_activite;
   SELECT COUNT(*) FROM opportunity_types;
   ```

3. **Réexécuter le script** (il est idempotent) :
   ```bash
   node scripts/database/3-insert-reference-data.js
   ```

---

## ❌ Les permissions ne s'assignent pas au Super Admin

### Symptôme
Le Super Admin n'a pas toutes les permissions dans l'application.

### Cause
Le script `4-assign-all-permissions.js` n'a pas été exécuté ou a échoué.

### Solution ✅
1. **Vérifier que les permissions existent** :
   ```sql
   SELECT COUNT(*) FROM permissions;
   -- Devrait retourner 321+
   ```

2. **Réexécuter l'assignation** :
   ```bash
   node scripts/database/4-assign-all-permissions.js
   ```

3. **Vérifier l'assignation** :
   ```sql
   SELECT COUNT(*) FROM role_permissions WHERE role_id = (
       SELECT id FROM roles WHERE code = 'SUPER_ADMIN'
   );
   ```

---

## 🆘 Problème Non Résolu ?

Si votre problème n'est pas listé ci-dessus :

1. **Consultez les logs complets** du script qui échoue
2. **Vérifiez votre fichier `.env`** :
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=ewm_db
   DB_USER=postgres
   DB_PASSWORD=votre_mot_de_passe
   NODE_ENV=development
   ```
3. **Testez la connexion PostgreSQL** manuellement avec `psql`
4. **Vérifiez la version de Node.js** : `node --version` (minimum v14)
5. **Vérifiez la version de PostgreSQL** : `psql --version` (minimum v12)

---

## 📞 Support

Pour plus d'aide, consultez :
- `README-ORDRE-SCRIPTS.md` - Ordre d'exécution des scripts
- `README-INITIALISATION-COMPLETE.md` - Documentation complète
- Les commentaires dans chaque script pour plus de détails
