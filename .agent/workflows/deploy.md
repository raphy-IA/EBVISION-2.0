---
description: Déployer l'application en production
---

# Workflow de déploiement EB-Vision 2.0

Ce workflow décrit comment déployer l'application en production sur un serveur Linux.

## Prérequis

Sur le serveur de production, assurez-vous d'avoir:
- Node.js (v18+)
- PostgreSQL
- Git
- PM2 ou systemd (pour gérer le processus)
- pg_dump / pg_restore (pour les backups)

## Options de déploiement

### Option 1: Git pull manuel puis migration

Si vous voulez contrôler chaque étape séparément:

```bash
# 1. Récupérer le code
git pull

# 2. Installer les dépendances
npm install --production

# 3. Exécuter les migrations
npm run migrate

# 4. Vérifier le schéma (optionnel)
npm run validate-schema

# 5. Redémarrer l'application
pm2 restart eb-vision-2.0
# ou
sudo systemctl restart eb-vision-2.0
```

### Option 2: Script de déploiement automatique (recommandé)

Le script `deploy.sh` fait tout automatiquement avec gestion d'erreurs et backup:

```bash
# Déploiement complet (pull + migrate + restart)
// turbo
./deploy.sh

# Seulement vérifier le schéma
./deploy.sh --check

# Déploiement sans git pull (si déjà fait)
./deploy.sh --skip-pull
```

## Commandes utiles

### Vérifier l'état des migrations

```bash
# Voir quelles migrations ont été exécutées
npm run validate-schema
```

### Créer une nouvelle migration

Sur votre environnement de développement:

1. Créez un fichier dans `migrations/` avec la convention de nommage:
   - Format: `NNN_description.sql` (ex: `012_add_user_preferences.sql`)
   - Le nombre doit suivre l'ordre séquentiel

2. Exemple de contenu:
```sql
-- Migration: Add user preferences table
-- Created: 2025-12-03

CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'fr',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

3. Testez localement:
```bash
npm run migrate
```

4. Committez et pushez:
```bash
git add migrations/012_add_user_preferences.sql
git commit -m "feat: add user preferences table"
git push
```

5. Sur le serveur de production, déployez:
```bash
./deploy.sh
```

## Résolution de problèmes

### La migration échoue en production

Le script `deploy.sh` restaure automatiquement la sauvegarde en cas d'échec.

Si vous devez restaurer manuellement:

```bash
# Lister les sauvegardes
ls -lh backups/

# Restaurer une sauvegarde spécifique
PGPASSWORD=$DB_PASSWORD pg_restore \
    -h localhost \
    -p 5432 \
    -U postgres \
    -d eb_vision_2_0 \
    -c \
    backups/db_backup_20251203_083000.sql
```

### Vérifier l'état de l'application

```bash
# Avec PM2
pm2 status
pm2 logs eb-vision-2.0

# Avec systemd
sudo systemctl status eb-vision-2.0
sudo journalctl -u eb-vision-2.0 -f
```

### Rollback d'une migration

Les migrations ne peuvent pas être annulées automatiquement. Si vous devez revenir en arrière:

1. Restaurez une sauvegarde de la base de données
2. Supprimez l'entrée de la migration dans `schema_migrations`:
```sql
DELETE FROM schema_migrations WHERE filename = '012_add_user_preferences.sql';
```

## Bonnes pratiques

1. **Toujours tester les migrations en dev/staging avant la production**
2. **Les migrations doivent être idempotentes** (utilisez `IF NOT EXISTS`, `IF EXISTS`, etc.)
3. **Ne jamais modifier une migration déjà exécutée** - créez une nouvelle migration pour corriger
4. **Faire un backup avant chaque déploiement** (le script le fait automatiquement)
5. **Documenter les migrations complexes** avec des commentaires SQL

## Sécurité

- Le fichier `.env` contient les credentials de la base de données
- Ne jamais committer le `.env` dans Git
- Utilisez des permissions restrictives: `chmod 600 .env`
- Limitez l'accès SSH au serveur de production

## Workflow Git recommandé

```bash
# Sur votre machine de dev (Windows)
1. Modifier le code
2. Créer/tester la migration localement
3. git add .
4. git commit -m "feat: description"
5. git push

# Sur le serveur de production (Linux)
1. Connectez-vous en SSH
2. cd /path/to/eb-vision-2.0
3. ./deploy.sh
4. Vérifiez que tout fonctionne
```
