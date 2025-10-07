# 🔄 Synchronisation Intelligente des Permissions et Menus - Améliorations

## 📋 Vue d'ensemble

Le système de synchronisation des permissions et menus a été amélioré pour gérer **automatiquement** la suppression des anciennes permissions obsolètes lors d'une synchronisation.

## ✨ Nouvelles fonctionnalités

### 1. Nettoyage automatique des permissions obsolètes

Le script détecte et supprime automatiquement les anciennes permissions de menu qui utilisent des codes obsolètes :

**Anciennes clés supprimées automatiquement :**
- `menu.business_units.*` → maintenant `menu.business_unit.*`
- `menu.collaborateurs.*` → maintenant `menu.gestion_rh.*`
- `menu.missions.*` → maintenant `menu.gestion_mission.*`
- `menu.opportunities.*` → maintenant `menu.market_pipeline.*`
- `menu.permissions.*` → maintenant `menu.paramètres_administration.*`
- `menu.reports.*` → maintenant `menu.rapports.*`
- `menu.settings.*` → maintenant `menu.configurations.*`
- `menu.time_entries.*` → maintenant `menu.gestion_des_temps.*`
- `menu.users.*` → maintenant `menu.paramètres_administration.*`

### 2. Normalisation améliorée des codes de permission

Les codes de permission sont maintenant générés avec une normalisation plus robuste :

```javascript
// Exemple : "Activités internes" → "activites_internes"
const itemCode = item.label
    .toLowerCase()
    .normalize('NFD')                    // Décomposer les caractères accentués
    .replace(/[\u0300-\u036f]/g, '')    // Supprimer les accents
    .replace(/[^a-z0-9\s]/g, '_')       // Remplacer les caractères spéciaux
    .replace(/\s+/g, '_')               // Remplacer les espaces
    .replace(/_+/g, '_')                // Consolider les underscores multiples
    .replace(/^_|_$/g, '');             // Nettoyer début/fin
```

### 3. Logs détaillés dans la console serveur

Lors de la synchronisation, le serveur affiche des logs détaillés :

```
🔄 Début de la synchronisation des permissions et menus...
🧹 Nettoyage des anciennes permissions de menu...
✅ 53 anciennes permissions de menu supprimées
📄 Synchronisation des permissions de pages...
✅ 12 permissions de pages ajoutées, 45 mises à jour
📋 Synchronisation des permissions de menu...
✅ 41 permissions de menu ajoutées, 3 mises à jour, 5 inchangées
✅ Synchronisation terminée avec succès
```

### 4. Message de succès amélioré dans l'interface

Le message de succès affiche maintenant le nombre de permissions supprimées :

```
✅ Synchronisation réussie !

Pages: 12 ajoutées, 45 mises à jour, 10 inchangées (67 total)
Sections de menu: 2 ajoutées, 7 mises à jour
Items de menu: 5 ajoutés, 36 mis à jour
Permissions: 53 ajoutées, 48 mises à jour, 53 supprimées, 15 inchangées
```

## 🔧 Processus de synchronisation

### Étapes automatiques

1. **Nettoyage** 🧹
   - Détection des anciennes permissions avec patterns obsolètes
   - Suppression automatique via `DELETE FROM permissions WHERE code LIKE ...`

2. **Scan des pages HTML** 📄
   - Parcours récursif de `/public/*.html`
   - Extraction des titres de page
   - Génération des codes `page.*`

3. **Analyse du menu** 📋
   - Parsing de `template-modern-sidebar.html`
   - Extraction des sections et items de menu
   - Génération des codes `menu.section.item`

4. **Mise à jour de la base de données** 💾
   - Création des nouvelles permissions
   - Mise à jour des permissions existantes
   - Préservation des associations rôles-permissions

5. **Rafraîchissement automatique** 🔄
   - Rechargement de la page après 3 secondes
   - Affichage immédiat des nouveaux menus

## 🎯 Cas d'usage

### Scenario 1 : Modification de la structure du menu

**Avant :**
```html
<!-- Menu Business Units -->
<a href="business-units.html">Unités d'affaires</a>
<a href="prospecting-campaigns.html">Campagnes de prospection</a>
```

**Après :**
```html
<!-- Menu Business Unit -->
<a href="business-units.html">Unités d'affaires</a>

<!-- Menu Market Pipeline -->
<a href="prospecting-campaigns.html">Campagnes de prospection</a>
```

**Résultat de la synchronisation :**
- ✅ Suppression de `menu.business_units.campaigns`
- ✅ Création de `menu.market_pipeline.campagnes_de_prospection`
- ✅ Préservation de `menu.business_unit.unités_d'affaires`

### Scenario 2 : Ajout d'une nouvelle page

1. Créer `/public/nouvelle-page.html` avec `<title>Ma Nouvelle Page</title>`
2. Cliquer sur "Synchroniser Permissions & Menus"
3. La permission `page.nouvelle_page` est automatiquement créée
4. Elle apparaît immédiatement dans l'onglet "Rôles et Permissions"

### Scenario 3 : Renommage d'un item de menu

1. Modifier le label dans `template-modern-sidebar.html`
2. Synchroniser
3. L'ancienne permission est mise à jour (pas de doublon)

## 🔒 Sécurité

### Restrictions d'accès

- **Accessible uniquement par SUPER_ADMIN**
- Vérification du rôle via `user_roles` table
- Protection au niveau backend (route `/api/sync/permissions-menus`)
- Protection au niveau frontend (bouton caché pour non-SUPER_ADMIN)

### Protection des données

- ⚠️ Les associations **rôles ↔ permissions** sont **préservées**
- ⚠️ Les permissions non liées aux menus ne sont **jamais supprimées**
- ✅ Transaction atomique (rollback en cas d'erreur)
- ✅ Logs détaillés dans la console serveur

## 🚀 Utilisation

### Interface web (recommandé)

1. Se connecter avec un compte SUPER_ADMIN
2. Aller sur `/permissions-admin.html`
3. Le bouton jaune "Synchroniser Permissions & Menus" apparaît en haut à droite
4. Cliquer et patienter 3 secondes pour le rechargement automatique

### Ligne de commande (développement)

```bash
# Pas de script CLI dédié car la logique est dans l'API
# Utiliser l'interface web ou un outil comme curl/Postman
```

## 📊 Statistiques de synchronisation

Le système retourne des statistiques détaillées :

```json
{
  "success": true,
  "message": "Synchronisation réussie",
  "stats": {
    "pages": {
      "added": 12,
      "updated": 45,
      "skipped": 10,
      "total": 67
    },
    "menus": {
      "sections": {
        "added": 2,
        "updated": 7
      },
      "items": {
        "added": 5,
        "updated": 36
      }
    },
    "permissions": {
      "added": 53,
      "updated": 48,
      "deleted": 53,
      "skipped": 15
    }
  }
}
```

## ⚠️ Points d'attention

### À faire AVANT une synchronisation

1. ✅ Vérifier que `template-modern-sidebar.html` est à jour
2. ✅ S'assurer que toutes les pages HTML ont un `<title>` correct
3. ✅ Sauvegarder la base de données si vous testez en production

### À vérifier APRÈS une synchronisation

1. ✅ Tester l'accès aux pages avec différents rôles
2. ✅ Vérifier que tous les items de menu s'affichent correctement
3. ✅ Consulter l'onglet "Permissions de Menu" pour valider la structure

## 🐛 Dépannage

### Problème : Les anciennes permissions apparaissent toujours

**Solution :** Vider le cache du navigateur (`Ctrl+F5`) ou attendre le rechargement automatique.

### Problème : Certains menus ne s'affichent pas après synchronisation

**Cause possible :** Mapping de section incorrect dans `permissions-admin.js`

**Solution :** Vérifier que `groupMenuPermissionsBySection()` et `sectionMapping` utilisent les bonnes clés.

### Problème : Erreur 500 lors de la synchronisation

**Vérifier :**
1. Les logs du serveur pour l'erreur exacte
2. Que PostgreSQL est accessible
3. Que les tables `permissions`, `menu_sections`, `menu_items` existent

## 📝 Maintenance

### Ajouter une nouvelle section de menu obsolète

Si vous changez encore la structure du menu à l'avenir, ajoutez le pattern à supprimer dans `src/routes/sync-permissions.js` :

```javascript
const obsoleteMenuPatterns = [
    'menu.business_units.%',
    'menu.collaborateurs.%',
    // ... autres patterns ...
    'menu.nouvelle_section_obsolete.%'  // ← Ajouter ici
];
```

## 🎓 Références

- **Code source :** `src/routes/sync-permissions.js`
- **Frontend :** `public/js/permissions-admin.js` (fonction `syncPermissionsAndMenus`)
- **Documentation de base :** `docs/FEATURE_SYNC_PERMISSIONS_MENUS.md`
- **Structure du menu :** `public/template-modern-sidebar.html`

---

**Date de création :** 2 octobre 2025  
**Version :** 2.0 (avec nettoyage automatique)  
**Auteur :** Système EB-Vision 2.0





