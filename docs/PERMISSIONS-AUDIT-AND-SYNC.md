# 🔐 Audit et Synchronisation Complète des Permissions

## 📋 Vue d'ensemble

Ce document décrit le processus complet d'audit et de synchronisation des permissions dans l'application EWM (Enterprise Workflow Management).

## 🎯 Objectif

S'assurer que **toutes** les permissions sont :
1. ✅ Identifiées depuis le code source (pages, routes, menus)
2. ✅ Créées dans la base de données avec les bonnes catégories
3. ✅ Configurables dans `/permissions-admin.html`
4. ✅ Respectant l'architecture établie

## 📁 Scripts Disponibles

### 1. Script d'Audit Complet
**Fichier**: `scripts/database/audit-permissions-complete.js`

**Utilisation**:
```bash
node scripts/database/audit-permissions-complete.js
```

**Fonctionnalités**:
- ✅ Scanne toutes les pages HTML dans `public/`
- ✅ Analyse toutes les routes API dans `src/routes/`
- ✅ Extrait la structure du menu depuis `template-modern-sidebar.html`
- ✅ Vérifie les permissions existantes en base de données
- ✅ Identifie les permissions manquantes
- ✅ Génère un rapport détaillé dans `audit-permissions-report.json`

**Résultat**:
- Rapport console avec résumé
- Fichier JSON avec tous les détails
- Liste des permissions manquantes par type (pages, routes, menu)

### 2. Script de Synchronisation Complète
**Fichier**: `scripts/database/sync-all-permissions-complete.js`

**Utilisation**:
```bash
node scripts/database/sync-all-permissions-complete.js
```

**Fonctionnalités**:
- ✅ Extrait les permissions depuis les routes API (avec `requirePermission()`)
- ✅ Extrait les permissions depuis tous les fichiers HTML
- ✅ Extrait les permissions depuis le menu (sidebar)
- ✅ Ajoute les permissions API de base
- ✅ Ajoute les permissions fonctionnelles standard (CRUD pour chaque module)
- ✅ Synchronise tout dans la base de données avec les bonnes catégories
- ✅ Crée les permissions manquantes
- ✅ Met à jour les permissions existantes si nécessaire

**Catégories de permissions créées**:
- `api` - Permissions API système
- `clients` - Permissions pour les clients
- `missions` - Permissions pour les missions
- `opportunities` - Permissions pour les opportunités
- `campaigns` - Permissions pour les campagnes
- `config` - Permissions de configuration
- `dashboard` - Permissions pour le dashboard
- `reports` - Permissions pour les rapports
- `menu` - Permissions de menu
- `pages` - Permissions d'accès aux pages
- `users` - Permissions pour les utilisateurs
- `hr` - Permissions RH
- `time` - Permissions de gestion du temps
- `invoices` - Permissions pour les factures
- Et autres catégories selon les modules

## 🔄 Processus Recommandé

### Étape 1: Audit Initial
```bash
node scripts/database/audit-permissions-complete.js
```

Examiner le rapport pour identifier:
- Les pages sans permissions
- Les routes sans permissions
- Les items de menu sans permissions

### Étape 2: Synchronisation
```bash
node scripts/database/sync-all-permissions-complete.js
```

Ce script va:
- Créer toutes les permissions manquantes
- Mettre à jour les permissions existantes
- Organiser par catégories

### Étape 3: Vérification
```bash
node scripts/database/audit-permissions-complete.js
```

Ré-exécuter l'audit pour vérifier que toutes les permissions sont maintenant présentes.

### Étape 4: Configuration dans l'Interface
1. Accéder à `/permissions-admin.html`
2. Vérifier que tous les modules apparaissent dans l'onglet "Rôles et Permissions"
3. Configurer les permissions pour chaque rôle selon les besoins

## 📊 Architecture des Permissions

### Structure en Base de Données

```sql
CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    code VARCHAR(255) UNIQUE NOT NULL,  -- Ex: "clients:read", "menu.dashboard.tableau_de_bord_principal"
    name VARCHAR(255) NOT NULL,          -- Ex: "Voir les clients"
    description TEXT,                   -- Description détaillée
    category VARCHAR(100),              -- Ex: "clients", "menu", "pages"
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Codes de Permissions

**Format**: `[module]:[action]` ou `[type].[section].[item]`

**Exemples**:
- `clients:read` - Lire les clients
- `clients:create` - Créer des clients
- `menu.dashboard.tableau_de_bord_principal` - Accès au menu Dashboard
- `page.missions` - Accès à la page missions.html
- `api.permissions.read` - Permission API pour lire les permissions

### Catégories de Permissions

Les permissions sont organisées par catégories pour faciliter la gestion dans `/permissions-admin.html`:

1. **API** (`api`) - Permissions système pour les APIs
2. **Clients** (`clients`) - Gestion des clients
3. **Missions** (`missions`) - Gestion des missions
4. **Opportunités** (`opportunities`) - Gestion des opportunités
5. **Campagnes** (`campaigns`) - Gestion des campagnes de prospection
6. **Config** (`config`) - Configuration système
7. **Dashboard** (`dashboard`) - Dashboards et analytics
8. **Rapports** (`reports`) - Génération de rapports
9. **Menu** (`menu`) - Permissions d'accès aux menus
10. **Pages** (`pages`) - Permissions d'accès aux pages HTML
11. **Users** (`users`) - Gestion des utilisateurs
12. **HR** (`hr`) - Ressources humaines
13. **Time** (`time`) - Gestion du temps
14. **Invoices** (`invoices`) - Facturation

## 🎨 Interface de Gestion des Permissions

### Page `/permissions-admin.html`

Cette page permet de gérer toutes les permissions avec plusieurs onglets:

1. **Rôles et Permissions**
   - Liste des rôles
   - Permissions par catégorie pour chaque rôle
   - Groupement automatique par catégorie

2. **Permissions Utilisateurs**
   - Permissions directes par utilisateur

3. **Rôles Utilisateurs**
   - Attribution de rôles aux utilisateurs

4. **Accès Business Units**
   - Gestion des accès par Business Unit

5. **Permissions de Menu**
   - Gestion spécifique des permissions de menu

6. **Audit**
   - Historique des modifications

### Fonctionnalités

- ✅ Groupement par catégorie automatique
- ✅ Sélection/désélection en masse par catégorie
- ✅ Filtrage des permissions de menu (onglet dédié)
- ✅ Affichage des permissions non-menu par catégorie
- ✅ Configuration par rôle ou par utilisateur

## 🔍 Vérification Post-Synchronisation

Après la synchronisation, vérifier:

1. **Toutes les catégories sont visibles** dans `/permissions-admin.html`
2. **Toutes les pages ont une permission** correspondante
3. **Toutes les routes ont une permission** correspondante
4. **Tous les items de menu ont une permission** correspondante
5. **Les permissions sont correctement catégorisées**

## 🚨 Problèmes Courants

### Problème: Seule la catégorie "api" est visible

**Solution**: Exécuter le script de synchronisation complète:
```bash
node scripts/database/sync-all-permissions-complete.js
```

### Problème: Des permissions manquent

**Solution**: 
1. Exécuter l'audit pour identifier les manquants
2. Vérifier que les routes/pages utilisent bien `requirePermission()`
3. Ré-exécuter la synchronisation

### Problème: Catégories incorrectes

**Solution**: Le script de synchronisation utilise un mapping automatique. Vérifier le mapping dans `sync-all-permissions-complete.js` si nécessaire.

## 📝 Maintenance

### Après l'ajout d'une nouvelle page

1. Créer la page HTML
2. Exécuter la synchronisation pour créer automatiquement la permission

### Après l'ajout d'une nouvelle route API

1. Ajouter `requirePermission('module:action')` dans la route
2. Exécuter la synchronisation pour créer automatiquement la permission

### Après l'ajout d'un nouvel item de menu

1. Ajouter `data-permission="menu.section.item"` dans la sidebar
2. Exécuter la synchronisation pour créer automatiquement la permission

## ✅ Checklist de Validation

- [ ] Audit initial exécuté
- [ ] Synchronisation complète exécutée
- [ ] Toutes les catégories visibles dans `/permissions-admin.html`
- [ ] Toutes les pages ont des permissions
- [ ] Toutes les routes ont des permissions
- [ ] Tous les items de menu ont des permissions
- [ ] Les permissions sont correctement catégorisées
- [ ] Les permissions sont configurables par rôle
- [ ] Les permissions sont configurables par utilisateur

## 📚 Ressources

- Script d'audit: `scripts/database/audit-permissions-complete.js`
- Script de synchronisation: `scripts/database/sync-all-permissions-complete.js`
- Page de gestion: `/permissions-admin.html`
- API de permissions: `/api/permissions/*`

