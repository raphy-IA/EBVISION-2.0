# 📖 INDEX DES SCRIPTS DE BASE DE DONNÉES

Ce document répertorie et explique l'utilité de chaque script présent dans `scripts/database/`.

---

## 📦 1. INITIALISATION COMPLÈTE
*Pour créer ou recréer la base de données de zéro.*

| Script | Description & Usage |
|--------|---------------------|
| **`0-init-complete.js`** | **🏁 LE SCRIPT PRINCIPAL.** Orchestre toute l'installation.<br>Exécute séquentiellement les étapes 1 à 4.<br>`node scripts/database/0-init-complete.js` |
| **`0-reset-database.js`** | **🧹 NETTOYAGE.** Permet de vider la base selon 4 niveaux :<br>1. Données (missions, temps...)<br>2. Structure (BU, Clients...)<br>3. Utilisateurs (sauf Admin)<br>4. RESET TOTAL (Base vide)<br>`node scripts/database/0-reset-database.js` |
| `1-init-database-tables.js` | Crée la structure (81 tables, index, contraintes, rôles). |
| `2-create-super-admin.js` | Crée le compte administrateur initial. |
| `3-insert-reference-data.js` | **TOUT-EN-UN.** Insère TOUTES les données de référence :<br>- Pays, Devises, Secteurs<br>- Types d'Opportunités & Étapes<br>- Types d'Objectifs & Métriques<br>- ...et bien plus. |
| `4-assign-all-permissions.js` | Donne toutes les permissions au Super Admin. |

---

## 🔄 2. SYNCHRONISATION (PROD ↔ DEV)
*Nouveau système fiable pour mettre à jour la production sans pertes.*

| Script | Description & Usage |
|--------|---------------------|
| **`1-export-schema-local.js`** | **💻 À LANCER EN LOCAL.**<br>Exporte la structure de votre base locale dans `schema-export.json`.<br>À faire après chaque modification de structure (migration). |
| **`2-sync-from-export-prod.js`** | **🌍 À LANCER EN PRODUCTION.**<br>Lit `schema-export.json` et applique les changements manquants (nouvelles colonnes/tables) sur la base de prod.<br>Non destructif. |
| `schema-export.json` | Fichier de référence contenant la définition de la base. Doit être commité dans Git. |

---

## 🎲 3. DONNÉES DE DÉMONSTRATION
*Pour peupler une base de développement ou de test.*

| Script | Description & Usage |
|--------|---------------------|
| `5-generate-demo-data.js` | Génère un petit jeu de données pour tester les fonctionnalités de base. |
| `7-generate-complete-demo.js` | Génère un jeu complet et réaliste (100+ employés, missions, temps, factures) pour les démos. |

---

## 🔧 4. MAINTENANCE & UTILITAIRES
*Outils pour la gestion quotidienne.*

| Script | Description & Usage |
|--------|---------------------|
| **`backup-database.js`** | **💾 SAUVEGARDE.** Crée un dump complet (`.sql`) de la base dans le dossier `backups/`. |
| `sync-all-permissions-complete.js` | **🔐 PERMISSIONS.** Scanne le code source JS pour trouver les nouvelles permissions définies et les insère en base.<br>À lancer après avoir créé de nouvelles pages/fonctionnalités. |
| `clean-all-timesheets.js` | Vide uniquement les tables liées aux temps (feuilles, entrées, validations). Utile pour remettre à zéro la saisie. |
| `extract-backup-data.js` | Outil pour extraire des tables spécifiques d'un gros fichier de backup. |

---



## 📂 STRUCTURE DES DOSSIERS

- **`data/`** : Contient les fichiers JSON de données brutes (villes, pays...).
- **`Docs/`** : Documentation technique de la base de données.
- **`utils/`** : Fonctions techniques partagées (ne pas exécuter directement).
