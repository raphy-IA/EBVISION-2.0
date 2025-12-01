# 📚 Scripts d'Initialisation de la Base de Données

## 🎯 Vue d'Ensemble

Ce dossier contient tous les scripts nécessaires pour initialiser et gérer la base de données de l'application EB-Vision 2.0.

---

## 🚀 Initialisation Rapide (Recommandé)

### ✨ Initialisation Complète en Une Commande

```bash
node scripts/database/0-init-complete.js
```

Ce script exécute automatiquement **toutes les étapes** d'initialisation dans le bon ordre :

1. **Structure** : Création de 81 tables et 11 rôles système
2. **Super Admin** : Création du compte administrateur
3. **Données de Référence** : Insertion des données système (secteurs, pays, etc.)
4. **Permissions** : Synchronisation de 321+ permissions depuis le code
5. **Assignation** : Attribution de toutes les permissions au Super Admin

**Durée estimée** : ~30-60 secondes

**Identifiants créés** :
- 📧 Email : `admin@ebvision.com`
- 🔑 Mot de passe : `Admin@2025`

---

## 🔧 Initialisation Modulaire (Avancé)

Si vous souhaitez exécuter les étapes manuellement ou personnaliser l'initialisation :

### Étape 0 : Réinitialisation (Optionnel)

```bash
node scripts/database/0-reset-database.js
```

⚠️ **ATTENTION** : Supprime TOUTES les données de la base !

### Étape 1 : Structure de la Base

```bash
node scripts/database/1-init-database-tables.js
```

- Crée 81 tables depuis `schema-structure-only.sql`
- Crée 11 rôles système (SUPER_ADMIN, ADMIN, MANAGER, etc.)
- Ajoute les colonnes de badge pour les rôles

### Étape 2 : Création du Super Admin

```bash
node scripts/database/2-create-super-admin.js
```

- Création interactive du compte Super Admin
- Attribution du rôle SUPER_ADMIN
- Génération automatique du login

### Étape 3 : Données de Référence

```bash
node scripts/database/3-insert-reference-data.js
```

Insère les données de référence de la base pure :

- **20 Secteurs d'activité** (Audit, Finance, Juridique, etc.)
- **20 Pays** (France, Sénégal, Cameroun, etc.)
- **3 Années fiscales** (Année précédente, actuelle, suivante)
- **5 Types d'opportunités** (Audit, Conseil, Formation, etc.)
- **4 Activités internes** (Congés, Recherches, etc.)
- **5 Tâches standard** (Audit des comptes, Analyse des risques, etc.)

### Étape 4 : Synchronisation des Permissions

```bash
node scripts/database/sync-all-permissions-complete.js
```

- Scanne automatiquement le code source
- Détecte toutes les permissions requises
- Crée 321+ permissions dans la base
- Catégorise par module

### Étape 5 : Assignation des Permissions

```bash
node scripts/database/4-assign-all-permissions.js
```

- Assigne toutes les permissions au SUPER_ADMIN
- Attribution au niveau rôle ET utilisateur
- Garantit l'accès complet

---

## 🎨 Génération de Données de Démo (Optionnel)

### Après l'initialisation, générez des données de test :

```bash
node scripts/database/5-generate-demo-data.js
```

Crée des données réalistes pour le développement et les tests :

- **3 Business Units**
- **6 Divisions**
- **6 Grades**
- **6 Postes**
- **~20 Collaborateurs** avec comptes utilisateurs
- **~10 Clients**
- **~15 Missions**

**Mot de passe démo** : `Demo@2025`

---

## 📋 Scripts Utilitaires

### Sauvegarde de la Base

```bash
node scripts/database/backup-database.js
```

Crée une sauvegarde complète dans `backups/backup_YYYYMMDD_HHMMSS.sql`

### Gestion des Types d'Opportunités

```bash
# Export
node scripts/database/export-opportunity-types.js

# Import
node scripts/database/import-opportunity-types.js
```

---

## 📁 Fichiers de Schéma

### `schema-structure-only.sql`

Schéma pur extrait de la base de référence :
- **Structure uniquement** (pas de données)
- 81 tables avec toutes leurs contraintes
- Rôles système pré-définis
- Base pour une installation vierge

### `schema-complete.sql` (Archive)

Sauvegarde complète de la base pure avec données. **Non utilisé** dans les scripts d'initialisation pour éviter d'importer des données de test.

---

## 🔄 Processus d'Initialisation pour un Nouveau Client

### 1. Configuration

Créez un fichier `.env` avec les paramètres du client :

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nom_client_db
DB_USER=postgres
DB_PASSWORD=mot_de_passe_securise
DB_SSL=false
```

### 2. Initialisation Complète

```bash
node scripts/database/0-init-complete.js
```

### 3. (Optionnel) Génération de Données de Démo

```bash
node scripts/database/5-generate-demo-data.js
```

### 4. Connexion

- **Email** : `admin@ebvision.com`
- **Mot de passe** : `Admin@2025`

⚠️ **Important** : Changez le mot de passe après la première connexion !

---

## 🛠️ Dépannage

### Erreur : "la relation ... n'existe pas"

→ La structure de la base n'a pas été créée correctement.  
**Solution** : Réexécutez l'étape 1 ou le script complet.

### Erreur : "le rôle SUPER_ADMIN n'existe pas"

→ Les rôles système n'ont pas été créés.  
**Solution** : Vérifiez que `schema-structure-only.sql` contient les INSERT pour les rôles.

### Erreur : "une valeur NULL viole la contrainte NOT NULL"

→ Un champ requis n'est pas fourni.  
**Solution** : Vérifiez que tous les champs obligatoires sont présents dans les scripts.

### Erreur : "la contrainte de vérification ... est violée"

→ Une valeur ne respecte pas une contrainte CHECK.  
**Solution** : Vérifiez les valeurs autorisées dans `schema-structure-only.sql`.

---

## 📝 Notes Importantes

1. **Base Pure** : Le fichier `backup_BD_reference.sql` est la référence absolue. Tout changement de schéma doit en découler.

2. **Données de Référence** : Les données insérées à l'étape 3 proviennent de la base pure et doivent être maintenues.

3. **Permissions** : Les permissions sont automatiquement extraites du code source. Pas besoin de les gérer manuellement.

4. **Rôles Système** : Les 7 rôles système (SUPER_ADMIN, ADMIN_IT, IT, ADMIN, ASSOCIE, DIRECTEUR, SUPER_USER) ne doivent **jamais** être supprimés.

5. **Extensions** : Les colonnes de badge pour les rôles (badge_hex_color, etc.) sont des extensions de la base pure.

---

## 🆘 Support

Pour toute question ou problème :

1. Consultez la documentation dans ce fichier
2. Vérifiez les logs d'erreur
3. Vérifiez que `.env` est correctement configuré
4. Assurez-vous que PostgreSQL est accessible

---

**Date de dernière mise à jour** : Novembre 2025  
**Version** : 2.0
