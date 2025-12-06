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

### 🌱 **POURQUOI TOUT EST DANS LE SCRIPT 3 ?**

Le script `3-insert-reference-data.js` centralise désormais **toutes** les insertions de données initiales pour simplifier la maintenance :
- Données RH (grades, postes)
- Données métier (types de missions, secteurs)
- Géographie (pays)
- Paramétrage (années fiscales, objectifs, métriques)

Il remplace tous les anciens scripts de "seed" individuels.

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

### 🔄 Mise à Jour du Schéma en Production (Deployment)
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
# Cela synchronise le schéma ET les permissions automatiquement
pm2 restart ebvision
```

### 🆕 Ajouter une Nouvelle Page ou Permission (Dev Workflow)

Le système détecte **automatiquement** les nouvelles permissions sans configuration manuelle :

1.  **Pages HTML** : Créez simplement votre fichier dans `public/` (ex: `ma-page.html`).
    *   Le script créera automatiquement la permission `page.ma_page`.
2.  **Routes API** : Utilisez `requirePermission('ma.nouvelle.perm')` dans votre code routeur.
    *   Le script détectera l'appel et créera la permission.
3.  **Menu** : Ajoutez `data-permission="..."` dans le fichier `template-modern-sidebar.html`.

**Workflow Développeur :**
1.  Codez en local (créez la page/route).
2.  `git push`
3.  Sur le serveur : `git pull` puis `node scripts/database/2-sync-from-export-prod.js`.
    *   Le script verra le nouveau fichier et créera la permission associée.


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
