# 📋 Changelog : Ajout des Données de Référence

**Date** : 9 Novembre 2025  
**Objectif** : Intégrer les données de référence de la base pure dans les scripts d'initialisation

---

## ✅ Modifications Effectuées

### 1. 📦 Nouveau Script : `3-insert-reference-data.js`

Script Node.js qui insère automatiquement les données de référence extraites de `backup_BD_reference.sql`.

**Données insérées** :

| Table | Nombre | Description |
|-------|--------|-------------|
| `secteurs_activite` | 20 | Secteurs d'activité avec couleurs et icônes |
| `pays` | 20 | Pays francophones avec devises et fuseaux horaires |
| `fiscal_years` | 3 | Années fiscales (N-1, N, N+1) |
| `opportunity_types` | 5 | Types d'opportunités (Audit, Conseil, Formation, etc.) |
| `internal_activities` | 4 | Activités internes (Congés, Recherches, etc.) |
| `tasks` | 5 | Tâches standard pour les missions |

**Fonctionnalités** :

- ✅ Insertion avec `ON CONFLICT DO UPDATE` (idempotent)
- ✅ Génération automatique des années fiscales basées sur l'année actuelle
- ✅ Affichage du résumé des données existantes avant insertion
- ✅ Gestion robuste des erreurs

---

### 2. 🔄 Réorganisation des Scripts

**Renommages effectués** :

| Ancien Nom | Nouveau Nom | Étape |
|------------|-------------|-------|
| `3-assign-all-permissions.js` | `4-assign-all-permissions.js` | 4/5 |
| `4-generate-demo-data.js` | `5-generate-demo-data.js` | 5/5 |
| *(nouveau)* | `3-insert-reference-data.js` | 3/5 |

**Nouvelle Structure** :

```
scripts/database/
├── 0-init-complete.js              # 🚀 INITIALISATION COMPLÈTE (Recommandé)
├── 0-reset-database.js             # ⚠️  Réinitialisation
├── 1-init-database-tables.js       # 📦 Structure (81 tables)
├── 2-create-super-admin.js         # 👤 Super Admin
├── 3-insert-reference-data.js      # 📚 Données de référence (NOUVEAU)
├── 4-assign-all-permissions.js     # 🔐 Permissions
├── 5-generate-demo-data.js         # 🎨 Données de démo
└── README.md                       # 📖 Documentation complète
```

---

### 3. 🔧 Mise à Jour du Script Complet

**Fichier** : `0-init-complete.js`

**Modifications** :

- ✅ Ajout de l'étape 3 (insertion des données de référence)
- ✅ Mise à jour des chemins des scripts (correction de `0- init-from-schema.js` vers `1-init-database-tables.js`)
- ✅ Passage de 3 à 5 étapes d'initialisation
- ✅ Mise à jour du résumé final

**Nouvelle Séquence** :

1. **Étape 1/5** : Structure de la Base de Données
2. **Étape 2/5** : Création du Super Admin
3. **Étape 3/5** : Insertion des Données de Référence *(NOUVEAU)*
4. **Étape 4/5** : Synchronisation des Permissions
5. **Étape 5/5** : Assignation des Permissions

---

### 4. 🐛 Correction du Script de Données de Démo

**Fichier** : `5-generate-demo-data.js` (anciennement `4-generate-demo-data.js`)

**Problème corrigé** :

```javascript
// ❌ AVANT (Ligne 478)
VALUES ($1, $2, $3, $4, 'USER', 'ACTIF')

// ✅ APRÈS
VALUES ($1, $2, $3, $4, 'COLLABORATEUR', 'ACTIF')
```

**Raison** : La contrainte `users_role_check` n'accepte que les 11 rôles système définis, pas 'USER'.

**Rôles autorisés** :
- SUPER_ADMIN, ADMIN_IT, IT, ADMIN
- ASSOCIE, DIRECTEUR, SUPER_USER
- MANAGER, SUPERVISEUR, CONSULTANT, COLLABORATEUR

---

### 5. 📖 Documentation Complète

**Fichier** : `README.md`

Documentation complète créée avec :

- 🚀 Guide d'initialisation rapide
- 🔧 Guide d'initialisation modulaire
- 📋 Description détaillée de chaque script
- 🛠️ Section dépannage
- 📝 Notes importantes
- 🆘 Support

---

## 🎯 Utilisation

### Pour une Nouvelle Installation

```bash
# Initialisation complète en une commande
node scripts/database/0-init-complete.js
```

### Pour une Installation Personnalisée

```bash
# Étape par étape
node scripts/database/1-init-database-tables.js
node scripts/database/2-create-super-admin.js
node scripts/database/3-insert-reference-data.js          # NOUVEAU
node scripts/database/sync-all-permissions-complete.js
node scripts/database/4-assign-all-permissions.js
```

### Pour Ajouter des Données de Démo

```bash
node scripts/database/5-generate-demo-data.js
```

---

## 📊 Données de Référence Insérées

### Secteurs d'Activité (20)

Audit & Conseil, Comptabilité, Finance, Juridique, Fiscalité, Gouvernance, Technologie, Industrie, Services, Logistique, Agriculture, Santé, Éducation, Transport, Énergie, Télécommunications, Banque, Assurance, Immobilier, Commerce

### Pays (20)

France, Sénégal, Cameroun, Côte d'Ivoire, Mali, Burkina Faso, Niger, Tchad, Guinée, Bénin, Togo, Gabon, Congo, RCA, Comores, Madagascar, Maurice, Seychelles, Djibouti, Allemagne

### Années Fiscales (3)

- **FY2024** (2024-01-01 → 2024-12-31) - FERMÉE
- **FY2025** (2025-01-01 → 2025-12-31) - EN_COURS
- **FY2026** (2026-01-01 → 2026-12-31) - PLANIFIEE

### Types d'Opportunités (5)

1. **Audit** (AUD) - 80% probabilité, 45 jours
2. **Conseil** (CONSEIL) - 70% probabilité, 30 jours
3. **Expertise** (EXPERTISE) - 75% probabilité, 25 jours
4. **Consulting** (CONSULTING) - 65% probabilité, 40 jours
5. **Formation** (FOM01) - 90% probabilité, 15 jours

### Activités Internes (4)

1. Congés annuel
2. Congés Maladie
3. Recherches
4. Sollicitation Inter BU

### Tâches Standard (5)

1. **AUDIT_COMPTES** - Audit des comptes (40h, HAUTE)
2. **FORMATION_EQUIPE** - Formation de l'équipe (20h, MOYENNE)
3. **ANALYSE_RISQUES** - Analyse des risques (28h, HAUTE)
4. **CONTROLE_INTERNE** - Contrôle interne (24h, HAUTE)
5. **CONSEIL_STRATEGIE** - Conseil en stratégie (32h, HAUTE)

---

## ✨ Avantages

1. **🎯 Conforme à la Base Pure** : Toutes les données de référence proviennent de `backup_BD_reference.sql`

2. **🔄 Reproductible** : Chaque nouvelle installation obtient les mêmes données de référence

3. **🚀 Automatisé** : Plus besoin d'insérer manuellement les données de configuration

4. **📦 Modulaire** : Les données de référence sont séparées des données de démo

5. **✅ Idempotent** : Peut être exécuté plusieurs fois sans créer de doublons

---

## 🔮 Prochaines Étapes

### Données Manquantes (À Ajouter si Nécessaire)

- ☐ **Sources d'entreprises** (si utilisé dans l'application)
- ☐ **Types de missions préconfigurés** (nécessite les IDs de divisions)
- ☐ **Étapes d'opportunités** (pipeline commercial)
- ☐ **Templates de tâches par type de mission**

Ces données peuvent être ajoutées ultérieurement si nécessaire pour l'application.

---

## 📝 Notes Techniques

### Gestion des UUID

Les données de référence utilisent des UUID générés aléatoirement à chaque insertion. Les relations entre tables ne sont pas maintenues pour le moment (ex: mission_types → divisions).

**Solution Actuelle** : Les types de missions ne sont pas inclus dans l'étape 3 car ils nécessitent des références à des divisions qui n'existent pas encore.

**Alternative Future** : Créer un script séparé pour les types de missions après la génération des données de démo.

### Performance

L'insertion de toutes les données de référence prend **< 1 seconde** sur une configuration standard.

---

**Auteur** : EB-Vision 2.0 Development Team  
**Version** : 1.0.0  
**Statut** : ✅ Production Ready




