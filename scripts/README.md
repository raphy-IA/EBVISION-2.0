# Scripts Organisation

Ce dossier contient tous les scripts utilitaires de l'application EB-Vision 2.0, organisés par catégorie.

## 📁 Structure

### `database/`
Scripts de base de données (initialisation, migrations, structure)

### `testing/`
Scripts de tests (API, UI, fonctionnalités)

### `deployment/`
Scripts de déploiement et synchronisation

### `maintenance/`
Scripts de maintenance et nettoyage

### `security/`
Scripts de sécurité et audits

### `debugging/`
Scripts de débogage et diagnostic

### `utilities/`
Scripts utilitaires divers

### `analysis/`
Scripts d'analyse et vérification

### `permissions/`
Scripts de gestion des permissions

### `ui/`
Scripts d'interface utilisateur

## 🚀 Utilisation

Pour exécuter un script, utilisez Node.js :

```bash
node scripts/[categorie]/[nom-du-script].js
```

## 🔑 Scripts principaux

### Initialisation de la base de données
```bash
# All-in-one (recommandé pour démarrer)
node scripts/database/init-super-admin-complete.js

# Ou modulaire
node scripts/database/1-init-database-tables.js
node scripts/database/2-create-super-admin.js
node scripts/database/3-assign-all-permissions.js
```

### Tests
```bash
# Tests API simples
node scripts/testing/test-api-simple.js

# Tests d'authentification
node scripts/testing/test-auth-flow.js
```

### Maintenance
```bash
# Nettoyage
node scripts/maintenance/simple-cleanup.js
```

## 📊 Statistiques

- **Scripts déplacés**: 251
- **Scripts ignorés**: 0
- **Erreurs**: 0
- **Total de catégories**: 10
