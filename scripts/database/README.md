# 📚 Guide des Scripts de Base de Données

Ce dossier contient tous les scripts pour gérer la base de données EB-Vision 2.0.

---

## 🎯 Structure Organisée

### 📦 **INITIALISATION COMPLÈTE** (Nouvelle base vide)

#### Script principal (utilise tous les autres)
- **`0-init-complete.js`** - Lance l'initialisation complète automatique (5 étapes)
  ```bash
  node scripts/database/0-init-complete.js
  ```

#### Scripts individuels (si besoin de contrôle fin)
1. **`0-reset-database.js`** - Réinitialisation progressive (4 niveaux)
   ```bash
   node scripts/database/0-reset-database.js
   ```

2. **`1-init-database-tables.js`** - Crée toutes les tables (81 tables + 11 rôles)
3. **`2-create-super-admin.js`** - Crée le compte Super Admin
4. **`3-insert-reference-data.js`** - Insère les données de référence
5. **`4-assign-all-permissions.js`** - Assigne toutes les permissions au SUPER_ADMIN

---

### 🔄 **SYNCHRONISATION DE SCHÉMA** (Production ↔ Local)

> **Nouveau système basé sur JSON** - Simple, fiable, versionné dans Git

#### En LOCAL (Développement)
```bash
# 1. Exporter le schéma local dans un JSON
node scripts/database/1-export-schema-local.js

# 2. Commiter et pusher
git add scripts/database/schema-export.json
git commit -m "chore: Update schema export"
git push origin main
```

#### En PRODUCTION (Serveur)
```bash
# 1. Pull les modifications
git pull origin main

# 2. Synchroniser automatiquement
node scripts/database/2-sync-from-export-prod.js

# 3. Redémarrer si besoin
pm2 restart ebvision
```

**Fichiers:**
- **`1-export-schema-local.js`** - Exporte le schéma local dans `schema-export.json`
- **`2-sync-from-export-prod.js`** - Compare et synchronise la production depuis le JSON
- **`schema-export.json`** - Schéma exporté (versionné dans Git)

**Avantages:**
- ✅ Aucun problème de connexion (pas besoin de se connecter aux 2 bases)
- ✅ Schéma versionné dans Git (historique complet)
- ✅ Génère seulement les `ALTER` nécessaires
- ✅ Aucun problème de permissions (`SET ROLE`)
- ✅ Compte rendu détaillé (X tables, Y colonnes comparées)

---

### 🎲 **DONNÉES DE DÉMONSTRATION**

- **`5-generate-demo-data.js`** - Génère des données de test
- **`7-generate-complete-demo.js`** - Génère un jeu complet de démo

---

### 🌱 **SEEDS & DONNÉES DE RÉFÉRENCE**

- **`seed_objective_types.js`** - Populate les types d'objectifs
- **`setup_metrics_sources.js`** - Configure les sources de métriques
- **`export-opportunity-types.js`** - Exporte les types d'opportunités

---

### 🔧 **MIGRATIONS SPÉCIFIQUES**

- **`run_migration_009.js`** - Exécute la migration 009
- **`run_migration_010.js`** - Exécute la migration 010
- **`run_migration_objectives.js`** - Migration pour les objectifs

---

### 🗄️ **MAINTENANCE & UTILITAIRES**

- **`backup-database.js`** - Sauvegarde la base de données
- **`sync-all-permissions-complete.js`** - Synchronise toutes les permissions depuis le code source
- **`utils/schema-initializer.js`** - Fonctions utilitaires pour l'initialisation

---

## 🚀 Workflows Typiques

### 🆕 Première Installation (Base vide)
```bash
# Tout en une seule commande
node scripts/database/0-init-complete.js
```

### 🔄 Mise à Jour du Schéma en Production
```bash
# EN LOCAL
node scripts/database/1-export-schema-local.js
git add scripts/database/schema-export.json
git commit -m "chore: Update schema"
git push

# EN PRODUCTION
cd ~/apps/ebvision
git pull
node scripts/database/2-sync-from-export-prod.js
pm2 restart ebvision
```

### 🧹 Réinitialisation (Niveaux)
```bash
# Niveau 1: Données opérationnelles (timesheets, missions, etc.)
# Niveau 2: Structure organisationnelle (BU, clients, etc.)
# Niveau 3: Personnel (utilisateurs sauf SUPER_ADMIN)
# Niveau 4: TOUT (base vierge)

node scripts/database/0-reset-database.js
# Puis suivre le menu interactif
```

### 🔐 Re-synchroniser les Permissions
```bash
# Si vous avez ajouté de nouvelles pages/routes
node scripts/database/sync-all-permissions-complete.js
```

---

## 📋 Notes Importantes

### ⚠️ Ordre d'Exécution (Initialisation)
L'ordre des scripts 0-4 est important:
1. **Tables** d'abord (structure)
2. **Super Admin** (utilisateur système)
3. **Données de référence** (pays, secteurs, etc.)
4. **Permissions** (synchronisation depuis le code)
5. **Assignation** (lier permissions au Super Admin)

### 🔑 Identifiants par Défaut
Après initialisation:
- **Email**: `admin@ebvision.com`
- **Mot de passe**: `Admin@2025`

### 💾 Sauvegardes
Avant toute opération destructive, les scripts créent automatiquement des sauvegardes dans `backups/`.

---

## 📚 Documentation Complète

Pour plus de détails, consultez:
- **`Docs/`** - Documentation technique détaillée
- **`.gemini/antigravity/brain/.../database_scripts_audit.md`** - Audit complet des scripts

---

## 🆘 Support

En cas de problème:
1. Vérifiez votre fichier `.env` (DB_HOST, DB_USER, DB_PASSWORD, etc.)
2. Vérifiez que PostgreSQL est démarré
3. Consultez les logs des scripts (très verbeux)
4. Consultez la documentation dans `Docs/`
