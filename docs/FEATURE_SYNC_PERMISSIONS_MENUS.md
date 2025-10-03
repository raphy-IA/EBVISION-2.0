# 🔄 Synchronisation Automatique des Permissions et Menus

**Date** : 2 octobre 2025  
**Version** : 2.2.0  
**Type** : Nouvelle Fonctionnalité  
**Accès** : SUPER_ADMIN uniquement

---

## 🎯 Objectif

Créer un système automatique de synchronisation qui scanne l'application pour détecter toutes les pages, menus et permissions, et les enregistrer automatiquement dans la base de données.

### **Problème Résolu**

Avant cette fonctionnalité :
- ❌ Les permissions devaient être ajoutées **manuellement** dans la base de données
- ❌ Les menus n'étaient pas synchronisés avec la structure réelle de l'application
- ❌ Risque d'**incohérence** entre le code et la configuration
- ❌ Pas de **traçabilité** des pages disponibles

Après cette fonctionnalité :
- ✅ Détection **automatique** de toutes les pages HTML
- ✅ Extraction **automatique** de la structure du menu
- ✅ Génération **automatique** des permissions
- ✅ Synchronisation en **un clic**

---

## 🔧 Fonctionnement Technique

### **Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                      SUPER_ADMIN                            │
│                           │                                 │
│                           ▼                                 │
│    ┌────────────────────────────────────────┐              │
│    │  Bouton "Synchroniser Permissions"     │              │
│    │  (visible uniquement pour SUPER_ADMIN) │              │
│    └────────────────────────────────────────┘              │
│                           │                                 │
│                           ▼                                 │
│    ┌────────────────────────────────────────┐              │
│    │   POST /api/sync/permissions-menus     │              │
│    │   (Backend: src/routes/sync-permissions.js) │         │
│    └────────────────────────────────────────┘              │
│                           │                                 │
│         ┌─────────────────┼─────────────────┐              │
│         ▼                 ▼                 ▼              │
│    ┌─────────┐      ┌──────────┐      ┌───────────┐       │
│    │ Scanner │      │ Extraire │      │ Synchroni │       │
│    │ Pages   │      │ Menus    │      │ ser BDD   │       │
│    │ HTML    │      │ Sidebar  │      │           │       │
│    └─────────┘      └──────────┘      └───────────┘       │
│         │                 │                 │              │
│         └─────────────────┼─────────────────┘              │
│                           ▼                                 │
│    ┌────────────────────────────────────────┐              │
│    │        Base de Données                 │              │
│    │  ┌──────────┐  ┌─────────────┐        │              │
│    │  │  pages   │  │menu_sections│        │              │
│    │  └──────────┘  └─────────────┘        │              │
│    │  ┌──────────┐  ┌─────────────┐        │              │
│    │  │menu_items│  │ permissions │        │              │
│    │  └──────────┘  └─────────────┘        │              │
│    └────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Tables de Base de Données

### **1. Table `pages`**
Stocke toutes les pages HTML de l'application.

```sql
CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Exemple de données** :
| id | title | url | created_at | updated_at |
|----|-------|-----|------------|------------|
| uuid | Administration des Permissions | /permissions-admin.html | 2025-10-02 | 2025-10-02 |
| uuid | Collaborateurs | /collaborateurs.html | 2025-10-02 | 2025-10-02 |

---

### **2. Table `menu_sections`**
Stocke les sections du menu de navigation.

```sql
CREATE TABLE menu_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Exemple de données** :
| id | code | name | created_at | updated_at |
|----|------|------|------------|------------|
| uuid | DASHBOARD | Dashboard | 2025-10-02 | 2025-10-02 |
| uuid | CONFIGURATIONS | Configurations | 2025-10-02 | 2025-10-02 |
| uuid | BUSINESS_UNIT | Business Unit | 2025-10-02 | 2025-10-02 |

---

### **3. Table `menu_items`**
Stocke les items du menu de navigation.

```sql
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(255) NOT NULL UNIQUE,
    label VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    section_id UUID REFERENCES menu_sections(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Exemple de données** :
| id | code | label | url | section_id | display_order |
|----|------|-------|-----|------------|---------------|
| uuid | menu.configurations.années_fiscales | Années fiscales | /fiscal-years.html | uuid_config | 1 |
| uuid | menu.configurations.pays | Pays | /pays.html | uuid_config | 2 |

---

### **4. Modification de `permissions`**
Ajout d'une colonne `category` pour classifier les permissions.

```sql
ALTER TABLE permissions ADD COLUMN category VARCHAR(50) DEFAULT 'general';
```

**Catégories** :
- `pages` : Permissions d'accès aux pages
- `menu` : Permissions d'affichage des menus
- `api` : Permissions d'accès aux API (futur)

---

## 🔍 Processus de Synchronisation

### **Étape 1 : Scan des Fichiers HTML**

Le système parcourt récursivement le dossier `public/` et :
- ✅ Détecte tous les fichiers `.html`
- ✅ Ignore les fichiers `template`, `backup`, etc.
- ✅ Extrait le titre de chaque page depuis la balise `<title>`
- ✅ Génère l'URL relative (`/nom-fichier.html`)

**Exclusions** :
- `node_modules/`
- `uploads/`
- `logs/`
- `css/`, `js/`, `images/`, `fonts/`
- Fichiers contenant `template` ou `backup`

---

### **Étape 2 : Extraction de la Structure du Menu**

Le système analyse `public/template-modern-sidebar.html` et :
- ✅ Identifie toutes les sections de menu (`<div class="sidebar-section">`)
- ✅ Extrait le nom de chaque section (`<div class="sidebar-section-title">`)
- ✅ Extrait tous les liens (`<a href="...">`) avec leurs labels
- ✅ Préserve l'ordre d'affichage

**Exemple d'extraction** :
```html
<!-- HTML Source -->
<div class="sidebar-section">
    <div class="sidebar-section-title">
        <i class="fas fa-cogs"></i>
        CONFIGURATIONS
    </div>
    <a href="fiscal-years.html" class="sidebar-nav-link">
        <i class="fas fa-calendar"></i>
        Années fiscales
    </a>
    <a href="pays.html" class="sidebar-nav-link">
        <i class="fas fa-globe"></i>
        Pays
    </a>
</div>

<!-- Extraction JSON -->
{
    "section": "CONFIGURATIONS",
    "code": "CONFIGURATIONS",
    "items": [
        { "url": "fiscal-years.html", "label": "Années fiscales" },
        { "url": "pays.html", "label": "Pays" }
    ]
}
```

---

### **Étape 3 : Synchronisation en Base de Données**

#### **Pour les Pages** :
```javascript
// Pour chaque page détectée
IF page existe déjà (basé sur URL):
    IF titre a changé:
        UPDATE pages SET title = nouveau_titre
    ELSE:
        SKIP (page inchangée)
ELSE:
    INSERT INTO pages (title, url)
```

#### **Pour les Sections de Menu** :
```javascript
// Pour chaque section détectée
IF section existe déjà (basé sur code):
    UPDATE menu_sections SET name = nouveau_nom
ELSE:
    INSERT INTO menu_sections (code, name)
```

#### **Pour les Items de Menu** :
```javascript
// Pour chaque item détecté
IF item existe déjà (basé sur code):
    UPDATE menu_items SET label, url, display_order
ELSE:
    INSERT INTO menu_items (code, label, url, section_id, display_order)
```

#### **Pour les Permissions** :
```javascript
// Permissions pour les pages
FOR EACH page:
    code = "page." + filename_sans_extension
    IF permission existe déjà:
        UPDATE permissions SET name, category
    ELSE:
        INSERT INTO permissions (code, name, category='pages')

// Permissions pour les menus
FOR EACH menu_item:
    code = "menu." + section_code + "." + label_normalized
    IF permission n'existe pas:
        INSERT INTO permissions (code, name, category='menu')
```

---

## 🖥️ Interface Utilisateur

### **Bouton de Synchronisation**

Le bouton n'est **visible que pour les SUPER_ADMIN** :

```html
<button id="syncPermissionsBtn" class="btn btn-warning" 
        onclick="syncPermissionsAndMenus()" 
        style="display: none;">
    <i class="fas fa-sync-alt me-2"></i>
    Synchroniser Permissions & Menus
</button>
```

**Position** : En haut à droite de la page `/permissions-admin.html`, à côté du titre.

---

### **États du Bouton**

#### **État Initial** (Caché)
```
[ Masqué si non SUPER_ADMIN ]
```

#### **État Actif** (Visible pour SUPER_ADMIN)
```
┌──────────────────────────────────────────┐
│  🔄 Synchroniser Permissions & Menus     │
└──────────────────────────────────────────┘
```

#### **État En Cours de Synchronisation**
```
┌──────────────────────────────────────────┐
│  ⏳ Synchronisation en cours...          │  (Désactivé)
└──────────────────────────────────────────┘
```

#### **État Succès**
```
┌──────────────────────────────────────────────────────┐
│  ✅ Synchronisation réussie !                        │
│                                                      │
│  Pages: 45 ajoutées, 2 mises à jour, 12 inchangées  │
│  Sections: 9 ajoutées, 0 mises à jour               │
│  Items: 52 ajoutés, 3 mis à jour                    │
│  Permissions: 97 ajoutées, 5 mises à jour           │
│                                                      │
│  ⟳ Rechargement dans 3 secondes...                  │
└──────────────────────────────────────────────────────┘
```

---

## 📝 Codes de Permission Générés

### **Format des Codes**

#### **Permissions de Pages** :
```
page.<nom_fichier_sans_extension>

Exemples :
- page.permissions_admin
- page.collaborateurs
- page.dashboard
- page.business_units
```

#### **Permissions de Menus** :
```
menu.<section_code>.<label_normalized>

Exemples :
- menu.configurations.années_fiscales
- menu.business_unit.unités_d_affaires
- menu.dashboard.tableau_de_bord_principal
```

**Normalisation** :
- Espaces → underscores (`_`)
- Caractères spéciaux → underscores
- Minuscules uniquement
- Accents préservés

---

## 🔒 Sécurité

### **Contrôle d'Accès**

1. **Vérification Backend** :
   ```javascript
   // Dans src/routes/sync-permissions.js
   const userRoles = await getUserRoles(req.user.id);
   if (!userRoles.includes('SUPER_ADMIN')) {
       return res.status(403).json({
           message: 'Accès refusé. Seuls les SUPER_ADMIN...'
       });
   }
   ```

2. **Vérification Frontend** :
   ```javascript
   // Dans public/js/permissions-admin.js
   async function checkSuperAdminAndShowSyncButton() {
       const roles = await getUserRoles();
       if (roles.includes('SUPER_ADMIN')) {
           showButton();
       }
   }
   ```

### **Protection Contre les Abus**

- ✅ Seul le rôle `SUPER_ADMIN` peut exécuter la synchronisation
- ✅ Le bouton est caché pour les autres utilisateurs
- ✅ Validation côté serveur (pas seulement client)
- ✅ Logs de toutes les synchronisations

---

## 🧪 Tests et Validation

### **Scénarios de Test**

#### **Test 1 : Synchronisation Initiale**
```bash
# État initial : Base de données vide
# Action : Cliquer sur "Synchroniser"
# Résultat attendu : 
#   - Toutes les pages détectées
#   - Toutes les sections de menu créées
#   - Tous les items de menu créés
#   - Toutes les permissions générées
```

#### **Test 2 : Synchronisation Incrémentale**
```bash
# État initial : Base de données déjà synchronisée
# Action : Ajouter une nouvelle page HTML
# Action : Cliquer sur "Synchroniser"
# Résultat attendu :
#   - Nouvelle page ajoutée
#   - Pages existantes inchangées
#   - Nouvelle permission créée
```

#### **Test 3 : Mise à Jour de Titre**
```bash
# État initial : Base de données déjà synchronisée
# Action : Modifier le <title> d'une page existante
# Action : Cliquer sur "Synchroniser"
# Résultat attendu :
#   - Titre de la page mis à jour
#   - URL inchangée
#   - Permission mise à jour
```

#### **Test 4 : Restriction d'Accès**
```bash
# Utilisateur : Non SUPER_ADMIN
# Action : Accéder à /permissions-admin.html
# Résultat attendu :
#   - Bouton de synchronisation INVISIBLE
#   - API retourne 403 si tentative de POST
```

---

## 📈 Statistiques de Synchronisation

Après chaque synchronisation, l'application affiche des statistiques détaillées :

```json
{
    "pages": {
        "added": 5,          // Nouvelles pages ajoutées
        "updated": 2,        // Pages mises à jour (titre modifié)
        "skipped": 38,       // Pages inchangées
        "total": 45          // Total de pages détectées
    },
    "menus": {
        "sections": {
            "added": 1,      // Nouvelles sections ajoutées
            "updated": 0     // Sections mises à jour
        },
        "items": {
            "added": 3,      // Nouveaux items ajoutés
            "updated": 1     // Items mis à jour
        }
    },
    "permissions": {
        "added": 8,          // Nouvelles permissions ajoutées
        "updated": 3,        // Permissions mises à jour
        "skipped": 86        // Permissions inchangées
    }
}
```

---

## 🚀 Utilisation

### **Étape 1 : Accéder à la Page**
1. Connectez-vous en tant que **SUPER_ADMIN**
2. Allez sur `/permissions-admin.html`

### **Étape 2 : Cliquer sur le Bouton**
1. Localisez le bouton **"Synchroniser Permissions & Menus"** en haut à droite
2. Cliquez sur le bouton

### **Étape 3 : Attendre la Synchronisation**
1. Le bouton affiche **"Synchronisation en cours..."**
2. Le processus prend généralement **2-5 secondes**

### **Étape 4 : Vérifier les Résultats**
1. Un message de succès s'affiche avec les statistiques
2. La page se recharge automatiquement après **3 secondes**
3. Les nouveaux menus et permissions sont disponibles

---

## 🔄 Quand Synchroniser ?

### **Synchronisation Requise** :
- ✅ Après avoir ajouté une nouvelle page HTML
- ✅ Après avoir modifié la structure du menu dans `template-modern-sidebar.html`
- ✅ Après avoir renommé une page
- ✅ Lors de la mise en production d'une nouvelle version

### **Synchronisation Optionnelle** :
- ⚠️ Après avoir modifié le contenu d'une page (sans changer le titre)
- ⚠️ Après avoir modifié les styles CSS

### **Synchronisation Non Nécessaire** :
- ❌ Après avoir modifié du code JavaScript
- ❌ Après avoir ajouté des images
- ❌ Après avoir modifié des routes API

---

## 📁 Fichiers Modifiés/Créés

| Fichier | Type | Action |
|---------|------|--------|
| `src/routes/sync-permissions.js` | Nouveau | Logique backend de synchronisation |
| `migrations/005_create_sync_tables.sql` | Nouveau | Création des tables BDD |
| `scripts/run-sync-migration.js` | Nouveau | Script d'exécution de la migration |
| `public/permissions-admin.html` | Modifié | Ajout du bouton de synchronisation |
| `public/js/permissions-admin.js` | Modifié | Logique frontend de synchronisation |
| `server.js` | Modifié | Enregistrement de la nouvelle route |
| `docs/FEATURE_SYNC_PERMISSIONS_MENUS.md` | Nouveau | Cette documentation |

---

## 🎯 Avantages

### **Pour les Développeurs** :
- ✅ Pas besoin d'ajouter manuellement les permissions
- ✅ Détection automatique des nouvelles pages
- ✅ Cohérence garantie entre code et base de données
- ✅ Gain de temps considérable

### **Pour les Administrateurs** :
- ✅ Vue complète de toutes les pages de l'application
- ✅ Contrôle centralisé des permissions
- ✅ Audit facilité (toutes les pages sont tracées)
- ✅ Mise à jour en un clic

### **Pour l'Application** :
- ✅ Structure de permissions maintenable
- ✅ Évolutivité simplifiée
- ✅ Documentation automatique des pages
- ✅ Base solide pour la gestion des droits

---

## 🐛 Dépannage

### **Problème : Le bouton n'apparaît pas**

**Cause** : L'utilisateur n'est pas SUPER_ADMIN

**Solution** :
1. Vérifier les rôles de l'utilisateur dans la table `user_roles`
2. Assigner le rôle SUPER_ADMIN si nécessaire

---

### **Problème : Erreur 403 lors de la synchronisation**

**Cause** : Le backend refuse l'accès

**Solution** :
1. Vérifier que l'utilisateur a bien le rôle SUPER_ADMIN dans la base de données
2. Vérifier que le token d'authentification est valide
3. Consulter les logs du serveur pour plus de détails

---

### **Problème : Certaines pages ne sont pas détectées**

**Cause** : Le fichier est dans un dossier exclu ou contient "template" ou "backup" dans son nom

**Solution** :
1. Vérifier que le fichier est bien dans `public/` ou un sous-dossier
2. Vérifier que le fichier ne contient pas "template" ou "backup" dans son nom
3. Vérifier que le dossier parent n'est pas dans la liste d'exclusion

---

### **Problème : Synchronisation lente**

**Cause** : Nombreux fichiers à scanner

**Solution** :
1. C'est normal pour la première synchronisation
2. Les synchronisations suivantes sont plus rapides (seulement les mises à jour)
3. Vérifier qu'il n'y a pas de boucles dans les dossiers (liens symboliques)

---

## 📚 Références

### **Fichiers Clés** :
- Backend : `src/routes/sync-permissions.js`
- Frontend : `public/js/permissions-admin.js`
- Migration : `migrations/005_create_sync_tables.sql`
- Template Menu : `public/template-modern-sidebar.html`

### **API Endpoint** :
- `POST /api/sync/permissions-menus`
- Authentification : Requise (Token JWT)
- Autorisation : SUPER_ADMIN uniquement

---

**Auteur** : Système EB-Vision 2.0  
**Date** : 2 octobre 2025  
**Version** : 2.2.0  
**Type** : Nouvelle Fonctionnalité



