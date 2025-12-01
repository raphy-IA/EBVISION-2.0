# 🔧 Guide d'Initialisation Modulaire

## 📋 Vue d'ensemble

Ce guide présente **3 scripts modulaires** qui permettent d'initialiser votre application étape par étape :

1. **`scripts/database/1-init-database-tables.js`** - Créer toutes les tables
2. **`scripts/database/2-create-super-admin.js`** - Créer un utilisateur super admin
3. **`scripts/database/3-assign-all-permissions.js`** - Affecter toutes les permissions

---

## 🎯 Avantages de l'Approche Modulaire

✅ **Contrôle total** - Exécutez uniquement ce dont vous avez besoin  
✅ **Interactif** - Les scripts posent des questions pour personnaliser  
✅ **Flexible** - Créez plusieurs super admins avec des identifiants différents  
✅ **Sûr** - Confirmations avant chaque action importante  
✅ **Réutilisable** - Peut être exécuté plusieurs fois sans problème  

---

## 📦 Script 1/3 : Initialisation des Tables

### 🎯 Ce que fait ce script :
- Demande les informations de connexion à la base de données
- Crée toutes les tables nécessaires (users, roles, permissions, etc.)
- Crée les rôles de base (SUPER_ADMIN, ADMIN, DIRECTEUR, etc.)
- Vérifie que tout est correctement créé

### 💻 Commande :
```bash
node scripts/database/1-init-database-tables.js
```

### 📝 Questions posées :
- **Hôte PostgreSQL** (ex: localhost)
- **Port PostgreSQL** (ex: 5432)
- **Nom de la base de données** ⚠️ Important
- **Utilisateur PostgreSQL** ⚠️ Important
- **Mot de passe PostgreSQL** ⚠️ Important
- **Utiliser SSL?** (Oui en production)

### ✅ Tables créées :

**Tables de sécurité :**
- `users` - Utilisateurs de l'application
- `roles` - Rôles système
- `permissions` - Permissions granulaires
- `user_roles` - Association utilisateurs-rôles
- `role_permissions` - Association rôles-permissions

**Tables de structure :**
- `business_units` - Unités d'affaires
- `divisions` - Divisions
- `grades` - Grades
- `postes` - Postes
- `collaborateurs` - Collaborateurs

**Tables métier :**
- `clients` - Clients
- `missions` - Missions
- `opportunities` - Opportunités
- `time_entries` - Saisie des temps
- `invoices` - Factures

**Total : 15 tables principales**

---

## 👤 Script 2/3 : Création Super Admin

### 🎯 Ce que fait ce script :
- Liste les utilisateurs existants (si applicable)
- Demande les informations du super admin à créer
- Valide le mot de passe (sécurité renforcée)
- Crée l'utilisateur avec le rôle SUPER_ADMIN

### 💻 Commande :
```bash
node scripts/database/2-create-super-admin.js
```

### 📝 Questions posées :
- **Nom** (ex: Dupont)
- **Prénom** (ex: Jean)
- **Login** (ex: admin) - Lettres, chiffres, - et _ uniquement
- **Email** (ex: admin@societe.com) - Format email valide
- **Mot de passe** - Masqué avec *
  - Minimum 8 caractères
  - Au moins 1 majuscule
  - Au moins 1 minuscule
  - Au moins 1 chiffre
  - Au moins 1 caractère spécial (!@#$%^&*...)
- **Confirmation mot de passe**

### ⚠️ Cas particuliers :

**Si l'utilisateur existe déjà :**
Le script détecte automatiquement et propose de mettre à jour l'utilisateur existant.

**Créer plusieurs super admins :**
Réexécutez simplement le script avec des identifiants différents.

---

## 🔐 Script 3/3 : Affectation des Permissions

### 🎯 Ce que fait ce script :
- Liste tous les utilisateurs Super Admin
- Crée ~60 permissions (menu + API)
- Associe TOUTES les permissions au rôle SUPER_ADMIN
- Vérifie que l'affectation est complète

### 💻 Commande :
```bash
node scripts/database/3-assign-all-permissions.js
```

### 📝 Questions posées :
- **Sélectionner l'utilisateur** (liste déroulante)
- **Confirmation** - Affecter toutes les permissions?

### 🔐 Permissions affectées :

**Permissions de Menu (47) :**
- Dashboard (9 permissions)
- Rapports (5 permissions)
- Gestion des Temps (3 permissions)
- Gestion (5 permissions)
- Prospection (5 permissions)
- Paramètres (20 permissions)

**Permissions API (10) :**
- Gestion des permissions
- Gestion des rôles
- Gestion des utilisateurs
- Gestion des entités métier

**Total : ~60 permissions**

---

## 🚀 Workflow Complet

### Cas d'usage 1 : Nouvelle Installation

```bash
# Étape 1 : Créer les tables
node scripts/database/1-init-database-tables.js

# Étape 2 : Créer le super admin
node scripts/database/2-create-super-admin.js

# Étape 3 : Affecter les permissions
node scripts/database/3-assign-all-permissions.js

# Étape 4 : Démarrer l'application
npm start
```

### Cas d'usage 2 : Ajouter un Super Admin

Si la base de données existe déjà :

```bash
# Créer un nouveau super admin
node scripts/database/2-create-super-admin.js

# Lui affecter toutes les permissions
node scripts/database/3-assign-all-permissions.js
```

### Cas d'usage 3 : Réaffecter les Permissions

Si vous avez ajouté de nouvelles permissions dans le code :

```bash
# Réexécuter l'affectation
node scripts/database/3-assign-all-permissions.js
```

---

## 💡 Conseils & Bonnes Pratiques

### 🔐 Sécurité

1. **Mot de passe fort** - Respectez les exigences de complexité
2. **Email professionnel** - Utilisez un email valide et accessible
3. **Login unique** - Évitez les logins génériques comme "admin"
4. **Changement après première connexion** - Recommandé

### 📊 Base de données

1. **Sauvegarde** - Sauvegardez avant d'exécuter les scripts
2. **Test** - Testez d'abord sur une base de test
3. **.env** - Utilisez le .env pour les infos de connexion
4. **SSL** - Activez SSL en production

### 🔄 Réexécution

Les scripts sont **idempotents** :
- Les tables ne sont créées que si elles n'existent pas
- Les rôles ne sont créés que s'ils n'existent pas
- Les permissions utilisent `ON CONFLICT DO NOTHING`
- Vous pouvez réexécuter sans risque

---

## 🆘 Dépannage

### Erreur de connexion à la base de données

```
❌ ERREUR: password authentication failed
```

**Solution :**
- Vérifiez le mot de passe PostgreSQL
- Vérifiez que PostgreSQL est démarré
- Vérifiez le fichier `.env`

### Le rôle SUPER_ADMIN n'existe pas

```
❌ Le rôle SUPER_ADMIN n'existe pas dans la base de données
```

**Solution :**
```bash
node scripts/database/1-init-database-tables.js
```

### Aucun utilisateur Super Admin trouvé

```
❌ Aucun utilisateur Super Admin trouvé
```

**Solution :**
```bash
node scripts/database/2-create-super-admin.js
```

### Mot de passe non conforme

```
❌ Le mot de passe doit contenir au moins une majuscule
```

**Solution :**
Respectez les exigences :
- 8+ caractères
- Majuscule + minuscule
- Chiffre + caractère spécial

---

## 🔄 Comparaison avec le Script Tout-en-Un

| Critère | Script Modulaire | Script Tout-en-Un |
|---------|------------------|-------------------|
| **Flexibilité** | ✅ Haute | ⚠️ Limitée |
| **Personnalisation** | ✅ Interactive | ⚠️ Modifier le code |
| **Contrôle** | ✅ Étape par étape | ⚠️ Tout ou rien |
| **Réutilisabilité** | ✅ Très haute | ⚠️ Limitée |
| **Courbe d'apprentissage** | ⚠️ 3 scripts | ✅ 1 seul script |
| **Rapidité** | ⚠️ 3 commandes | ✅ 1 commande |

### Quand utiliser quoi ?

**Scripts Modulaires (1, 2, 3) :**
- ✅ Vous voulez contrôler chaque étape
- ✅ Vous devez créer plusieurs super admins
- ✅ Vous personnalisez les identifiants
- ✅ Vous testez progressivement

**Script Tout-en-Un (`init-super-admin-complete.js`) :**
- ✅ Installation rapide
- ✅ Identifiants par défaut OK
- ✅ Première installation
- ✅ Environnement de test

---

## 📚 Scripts Disponibles

| Script | Fichier | Description |
|--------|---------|-------------|
| **Modulaire 0** | `scripts/database/0-reset-database.js` | Remise à zéro DB |
| **Modulaire 1** | `scripts/database/1-init-database-tables.js` | Créer tables + rôles |
| **Modulaire 2** | `scripts/database/2-create-super-admin.js` | Créer super admin |
| **Modulaire 3** | `scripts/database/3-assign-all-permissions.js` | Affecter permissions |
| **Tout-en-Un** | `scripts/database/init-super-admin-complete.js` | Tout en une fois |

---

## ✅ Checklist Post-Installation

Après avoir exécuté les 3 scripts :

- [ ] Connexion réussie avec les identifiants créés
- [ ] Tous les menus sont visibles dans la sidebar
- [ ] Accès à la page "Gestion des permissions"
- [ ] Possibilité de créer d'autres utilisateurs
- [ ] Le branding est correctement appliqué

---

**🎉 Votre application est prête !**

Pour toute question, consultez :
- `INIT-SUPER-ADMIN.md` - Guide du script tout-en-un
- `QUICK-START.txt` - Aide-mémoire rapide

