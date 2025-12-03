# Système de Migrations et Validation de Schéma

Ce document explique comment utiliser le système de migrations pour gérer l'évolution de la base de données PostgreSQL.

## 📋 Vue d'ensemble

Le système comprend 4 scripts principaux :

| Script | Commande | Usage |
|--------|----------|-------|
| **Migration Runner** | `npm run migrate` | Exécute les nouvelles migrations |
| **Schema Validator** | `npm run validate-schema` | Vérifie et affiche le schéma actuel |
| **Init Migrations** | `npm run init-migrations` | Initialise le tracking (une seule fois) |
| **Deploy Script** | `./deploy.sh` | Déploiement complet (Linux uniquement) |

## 🚀 Installation initiale (première fois uniquement)

Si vous configurez ce système sur une base de données **existante** :

```bash
# Marquer toutes les migrations existantes comme déjà exécutées
npm run init-migrations
```

✅ Cela crée la table `schema_migrations` et enregistre toutes les migrations existantes.

⚠️ **À exécuter UNE SEULE FOIS** lors de la mise en place du système.

## 📝 Créer une nouvelle migration

### 1. Créer le fichier de migration

Les migrations sont des fichiers SQL dans le dossier `migrations/` avec la convention :

```
NNN_description.sql
```

Exemple : `012_add_user_preferences.sql`

**Règles importantes :**
- Le numéro doit suivre l'ordre séquentiel (après la dernière migration)
- Utiliser des underscores `_` (pas d'espaces)
- Description courte et descriptive
- Extension `.sql` obligatoire

### 2. Écrire la migration

Les migrations doivent être **idempotentes** (peuvent être exécutées plusieurs fois sans erreur) :

```sql
-- Migration: Add user preferences table
-- Created: 2025-12-03
-- Description: Ajoute une table pour stocker les préférences utilisateur

-- Créer la table (idempotent avec IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'fr',
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Créer l'index (idempotent avec IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
ON user_preferences(user_id);

-- Ajouter une colonne (protégé contre les doublons)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'last_login'
    ) THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
    END IF;
END $$;
```

### 3. Tester en développement

```bash
# Exécuter la migration
npm run migrate

# Vérifier le résultat
npm run validate-schema
```

### 4. Committer et déployer

```bash
git add migrations/012_add_user_preferences.sql
git commit -m "feat: add user preferences table"
git push
```

## 🔄 Workflow de développement

### Sur votre machine de développement (Windows)

```bash
# 1. Créer une nouvelle migration
# Créez le fichier migrations/XXX_description.sql

# 2. Tester localement
npm run migrate

# 3. Vérifier le schéma
npm run validate-schema

# 4. Si tout est OK, committer
git add migrations/
git commit -m "feat: description"
git push
```

### Sur le serveur de production (Linux)

**Option 1 : Automatique (recommandé)**

```bash
# Déploiement complet avec backup automatique
./deploy.sh
```

**Option 2 : Manuel**

```bash
# 1. Récupérer le code
git pull

# 2. Exécuter les migrations
npm run migrate

# 3. Vérifier le schéma
npm run validate-schema

# 4. Redémarrer l'application
pm2 restart eb-vision-2.0
```

## 🔍 Vérification du schéma

Le script `validate-schema.js` affiche un rapport détaillé :

```bash
npm run validate-schema
```

**Informations affichées :**
- Liste de toutes les tables
- Colonnes avec types et contraintes
- Index
- Clés étrangères
- Liste des migrations exécutées

## 📦 Système de tracking des migrations

Les migrations exécutées sont enregistrées dans la table `schema_migrations` :

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | SERIAL | ID auto-incrémenté |
| `filename` | VARCHAR(255) | Nom du fichier de migration |
| `executed_at` | TIMESTAMP | Date d'exécution |
| `checksum` | VARCHAR(64) | Hash MD5 du contenu |

### Voir les migrations exécutées

```sql
SELECT filename, executed_at 
FROM schema_migrations 
ORDER BY executed_at;
```

## 🛡️ Bonnes pratiques

### ✅ À FAIRE

1. **Toujours tester en dev avant la prod**
2. **Rendre les migrations idempotentes** (`IF NOT EXISTS`, etc.)
3. **Documenter les migrations complexes** avec des commentaires
4. **Sauvegarder avant chaque déploiement** (automatique avec `deploy.sh`)
5. **Utiliser des transactions** (automatique dans le script)
6. **Suivre la convention de nommage** : `NNN_description.sql`

### ❌ À ÉVITER

1. ❌ **Modifier une migration déjà exécutée** → créer une nouvelle migration
2. ❌ **Supprimer des migrations du dossier** → elles sont déjà dans la BD
3. ❌ **Exécuter les migrations manuellement** → utiliser `npm run migrate`
4. ❌ **Oublier de tester en dev** → risque de casser la prod
5. ❌ **Migrations non-idempotentes** → erreurs si réexécutées

## 🚨 Résolution de problèmes

### Une migration échoue en production

Le script `deploy.sh` restaure automatiquement la sauvegarde.

**Restauration manuelle :**

```bash
# Lister les sauvegardes
ls -lh backups/

# Restaurer
PGPASSWORD=$DB_PASSWORD pg_restore \
    -h localhost \
    -p 5432 \
    -U postgres \
    -d eb_vision_2_0 \
    -c \
    backups/db_backup_20251203_083000.sql
```

### Migrations détectées mais déjà appliquées manuellement

Si vous avez appliqué des migrations manuellement, marquez-les comme exécutées :

```sql
INSERT INTO schema_migrations (filename) 
VALUES ('012_add_user_preferences.sql');
```

### Rollback d'une migration

Les migrations ne peuvent pas être annulées automatiquement.

**Solution :**

1. Restaurer une sauvegarde de la BD
2. OU créer une migration inverse (exemple : `013_remove_user_preferences.sql`)

### Schema drift (différences entre dev et prod)

```bash
# 1. Vérifier le schéma en production
npm run validate-schema

# 2. Comparer avec le dev
# Créer une migration pour corriger les différences

# 3. Tester la migration en dev
npm run migrate

# 4. Déployer en prod
./deploy.sh
```

## 📊 Exemples de migrations courantes

### Ajouter une table

```sql
CREATE TABLE IF NOT EXISTS example (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Ajouter une colonne

```sql
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'phone'
    ) THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
    END IF;
END $$;
```

### Créer un index

```sql
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

### Ajouter une contrainte

```sql
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_email_unique'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
    END IF;
END $$;
```

### Modifier une colonne

```sql
-- Modifier le type d'une colonne
ALTER TABLE users ALTER COLUMN phone TYPE VARCHAR(30);

-- Ajouter une contrainte NOT NULL
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- Définir une valeur par défaut
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'active';
```

## 🔐 Sécurité

- Les credentials PostgreSQL sont dans `.env` (ne jamais committer)
- Les backups sont créés automatiquement dans `backups/`
- Les migrations s'exécutent dans des transactions (rollback automatique en cas d'erreur)
- Le script `deploy.sh` vérifie l'intégrité avant de redémarrer l'application

## 📚 Ressources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [SQL Best Practices](https://www.sqlstyle.guide/)
- Workflow de déploiement : `.agent/workflows/deploy.md`

---

**Questions ou problèmes ?** Consultez le workflow `/deploy` ou vérifiez les logs avec `npm run validate-schema`.
