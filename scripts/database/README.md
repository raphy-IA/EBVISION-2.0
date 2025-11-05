# 🗄️ Scripts de Base de Données

Ce dossier contient tous les scripts liés à la gestion, l'initialisation et la maintenance de la base de données PostgreSQL.

---

## 📋 Scripts Principaux d'Initialisation

### 🔢 Ordre d'exécution pour une nouvelle installation

#### Option 1 : All-in-One (Recommandé)
```bash
node scripts/database/init-super-admin-complete.js
```
**Ce script fait tout en une fois :**
- ✅ Crée toutes les tables
- ✅ Insère les rôles de base
- ✅ Crée un utilisateur SUPER_ADMIN
- ✅ Assigne toutes les permissions

---

#### Option 2 : Modulaire (Plus de contrôle)

**1️⃣ Initialiser les tables et rôles**
```bash
node scripts/database/1-init-database-tables.js
```
- Crée toutes les tables de l'application
- Insère les 7 rôles de base (SUPER_ADMIN, ADMIN, DIRECTEUR, etc.)
- Peut créer une nouvelle base de données ou utiliser une existante
- **Idempotent** : Peut être exécuté plusieurs fois sans danger

**2️⃣ Créer un Super Administrateur**
```bash
node scripts/database/2-create-super-admin.js
```
- Création interactive d'un compte SUPER_ADMIN
- Validation forte du mot de passe
- Hash sécurisé avec bcrypt

**3️⃣ Assigner toutes les permissions**
```bash
node scripts/database/3-assign-all-permissions.js
```
- Liste les super admins existants
- Permet de sélectionner un utilisateur
- Assigne toutes les permissions menu et API

---

## 🔄 Script de Remise à Zéro

### `0-reset-database.js` - Remise à zéro de la base de données

**Usage :**
```bash
node scripts/database/0-reset-database.js
```

**4 niveaux de remise à zéro disponibles :**

#### 🧹 **LÉGÈRE** - Nettoyage de test/démo
- ✅ Conserve : Tables, Rôles, Super Admins, Permissions, Business Units
- 🗑️ Supprime : Campagnes de test, Opportunités de démo, Notifications
- **Idéal pour** : Nettoyer après des tests

#### ⚠️ **MODÉRÉE** - Données opérationnelles
- ✅ Conserve : Tables, Rôles, Super Admins, Permissions
- 🗑️ Supprime : Collaborateurs, Opportunités, Campagnes, Contrats, etc.
- **Idéal pour** : Repartir avec une base propre mais configurée

#### 🔥 **COMPLÈTE** - Toutes les données
- ✅ Conserve : Tables, Rôles
- 🗑️ Supprime : **TOUS** les utilisateurs, **TOUTES** les données
- **Idéal pour** : Reset total avant une nouvelle installation
- ⚠️ Nécessite de recréer un super admin après

#### 💀 **BRUTALE** - Tout supprimer et recréer
- 🗑️ Supprime : **TOUT** (tables, données, rôles, permissions)
- **Idéal pour** : Repartir de zéro absolu
- ⚠️ Nécessite de réexécuter l'initialisation complète après

**Sécurité :**
- Demande de confirmation avec saisie du nom du niveau
- Double confirmation pour les niveaux COMPLÈTE et BRUTALE
- Affiche les statistiques avant/après
- Peut être annulé à tout moment avec `Ctrl+C`

---

## 🔍 Scripts de Vérification et Diagnostic

### Structure de la base de données
- `check-database-consistency.js` - Vérifie la cohérence de la DB
- `check-database-status.js` - État général de la base
- `check-missing-tables.js` - Détecte les tables manquantes
- `check-tables-structure.js` - Vérifie la structure des tables
- `compare-database-structure.js` - Compare la structure locale/production

### Tables spécifiques
- `check-users-table-structure.js` - Structure de la table users
- `check-collaborateurs-table-structure.js` - Structure de la table collaborateurs
- `check-permissions-table-structure.js` - Structure de la table permissions
- `check-role-permissions-structure.js` - Structure des relations rôles/permissions
- `check-roles-table.js` - Structure de la table roles
- `check-rh-tables.js` - Tables RH (évolutions, compétences, formations)
- `check-secteurs-db.js` - Table secteurs

### Tests de connexion
- `test-database.js` - Test complet de connexion
- `test-local-db-connection.js` - Test connexion locale
- `simple-db-test.js` - Test simple et rapide
- `diagnose-database.js` - Diagnostic complet

---

## 🔧 Scripts de Maintenance

### Backups et Dumps
- `create-clean-backup.js` - Crée un backup propre
- `create-clean-dump.js` - Dump nettoyé
- `create-clean-local-dump.js` - Dump local nettoyé
- `create-production-dump.js` - Dump de production

### Correction de problèmes
- `fix-database-consistency.js` - Corrige les incohérences
- `fix-database-differences.js` - Synchronise les différences
- `fix-missing-tables.js` - Crée les tables manquantes
- `fix-missing-tables-production.js` - Idem pour production

---

## 📊 Scripts d'Analyse et Export

### Export de structure
- `export-database-structure.js` - Exporte la structure complète
- `export-database-structure-local.js` - Export structure locale
- `export-database-structure-production.js` - Export structure production
- `database-structure-local.json` - Structure sauvegardée (JSON)

### Comptage et statistiques
- `count-records.js` - Compte les enregistrements par table
- `test-sql-query.js` - Exécute des requêtes SQL de test

---

## 🔄 Scripts de Migration

### Migrations système
- `apply-2fa-migration.js` - Applique la migration 2FA
- `migrate-to-multi-roles.js` - Migration vers multi-rôles
- `migrate-to-multiple-roles.js` - Migration système de rôles
- `run-super-admin-migration.js` - Migration super admin
- `run-sync-migration.js` - Migration de synchronisation

---

## 🎯 Scénarios d'Utilisation Courants

### 🆕 Nouvelle Installation
```bash
# Méthode recommandée (tout en un)
node scripts/database/init-super-admin-complete.js

# OU méthode modulaire
node scripts/database/1-init-database-tables.js
node scripts/database/2-create-super-admin.js
node scripts/database/3-assign-all-permissions.js
```

### 🧪 Après des Tests - Nettoyage Léger
```bash
node scripts/database/0-reset-database.js
# Choisir : LÉGÈRE
```

### 🔄 Repartir à Zéro avec Configuration
```bash
node scripts/database/0-reset-database.js
# Choisir : MODÉRÉE
# Puis recréer les collaborateurs et données
```

### 💥 Reset Total
```bash
node scripts/database/0-reset-database.js
# Choisir : COMPLÈTE ou BRUTALE
# Puis réinitialiser :
node scripts/database/1-init-database-tables.js
node scripts/database/2-create-super-admin.js
```

### 🔍 Vérification de Santé
```bash
node scripts/database/check-database-consistency.js
node scripts/database/check-database-status.js
```

### 💾 Backup Avant Modifications
```bash
node scripts/database/create-clean-backup.js
```

---

## ⚙️ Configuration Requise

Tous les scripts utilisent les variables d'environnement du fichier `.env` :

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=votre_base
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe
```

---

## 🆘 Aide et Support

### En cas de problème

1. **Vérifier la connexion**
   ```bash
   node scripts/database/simple-db-test.js
   ```

2. **Diagnostiquer**
   ```bash
   node scripts/database/diagnose-database.js
   ```

3. **Vérifier la structure**
   ```bash
   node scripts/database/check-database-consistency.js
   ```

4. **En dernier recours - Reset complet**
   ```bash
   node scripts/database/0-reset-database.js
   # Choisir : BRUTALE
   node scripts/database/init-super-admin-complete.js
   ```

---

## 📝 Notes Importantes

- ⚠️ **Toujours faire un backup avant une remise à zéro**
- ✅ Les scripts d'initialisation sont **idempotents** (peuvent être réexécutés)
- 🔒 Les scripts de remise à zéro demandent **toujours confirmation**
- 🛡️ Les mots de passe sont **toujours hashés** avec bcrypt
- 📊 Les scripts affichent des **statistiques** avant/après les opérations

---

## 🚀 Développement

Pour ajouter un nouveau script de base de données :
1. Créer le fichier dans `scripts/database/`
2. Commencer par `#!/usr/bin/env node`
3. Utiliser `dotenv` pour charger les variables d'environnement
4. Ajouter une gestion d'erreur appropriée
5. Documenter dans ce README

---

**Dernière mise à jour** : 03/11/2025



