# 🚀 Guide d'Initialisation Complète de la Base de Données

## 📌 Vue d'Ensemble

Ce guide vous permet de créer une **nouvelle base de données fonctionnelle** pour un nouveau client en **3 étapes simples**.

---

## ✅ Prérequis

1. **PostgreSQL installé** et en cours d'exécution
2. **Node.js** installé (v14+)
3. **Fichier `.env` configuré** avec les bonnes credentials :
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=nom_de_votre_base
   DB_USER=postgres
   DB_PASSWORD=votre_mot_de_passe
   ```

---

## 🎯 Processus en 3 Étapes

### **MÉTHODE COMPLÈTE (Recommandé) : Tout en 1 commande**

**Script** : `0-init-complete.js`

**Ce qu'il fait** :
- ✅ Exécute automatiquement les 3 étapes ci-dessous
- ✅ Crée toutes les tables (81 tables)
- ✅ Crée les 11 rôles de base (7 système + 4 non-système)
- ✅ Crée le super administrateur initial
- ✅ Crée les 321 permissions
- ✅ Assigne tout au SUPER_ADMIN

**Commande** :
```bash
node scripts/database/0-init-complete.js
```

**Durée estimée** : 20-30 secondes

---

## 🔧 MÉTHODE MODULAIRE (Pour plus de contrôle)

Si vous préférez exécuter chaque étape manuellement :

### **ÉTAPE 1️⃣ : Créer la Structure de la Base de Données**

**Script** : `1-init-database-tables.js`

**Ce qu'il fait** :
- ✅ Crée toutes les tables (81 tables)
- ✅ Crée les 11 rôles de base (7 système + 4 non-système)
- ✅ Crée le super administrateur initial
- ✅ Assigne le rôle SUPER_ADMIN au super admin

**Commande** :
```bash
node scripts/database/1-init-database-tables.js
```

**Données créées** :
- **Tables** : 81 (structure complète conforme à la base pure)
- **Rôles** :
  - Système (7) : SUPER_ADMIN, ADMIN_IT, IT, ADMIN, MANAGER, CONSULTANT, COLLABORATEUR
  - Non-système (4) : ASSOCIE, DIRECTEUR, SUPER_USER, SUPERVISEUR

**Durée estimée** : 5-10 secondes

---

### **ÉTAPE 2️⃣ : Créer le Super Administrateur**

**Script** : `2-create-super-admin.js`

**Ce qu'il fait** :
- ✅ Crée l'utilisateur super administrateur
- ✅ Vous demande interactivement l'email et le mot de passe
- ✅ Assigne le rôle SUPER_ADMIN

**Commande** :
```bash
node scripts/database/2-create-super-admin.js
```

**Durée estimée** : 10 secondes

---

### **ÉTAPE 3️⃣ : Créer Toutes les Permissions**

**Script** : `sync-all-permissions-complete.js`

**Ce qu'il fait** :
- ✅ Scanne automatiquement toutes les routes API
- ✅ Scanne toutes les pages HTML
- ✅ Scanne tous les menus de la sidebar
- ✅ Crée 321 permissions organisées en 20 catégories

**Commande** :
```bash
node "scripts/database/sync-all-permissions-complete.js"
```

**Permissions créées (321 au total)** :
- **Dashboard** : 20 permissions
- **Clients** : 11 permissions
- **Missions** : 17 permissions
- **Opportunities** : 20 permissions
- **Campaigns** : 16 permissions
- **Reports** : 9 permissions
- **HR (Ressources Humaines)** : 47 permissions
- **Time (Gestion du temps)** : 16 permissions
- **Config** : 54 permissions
- **API** : 22 permissions
- **Menu** : 41 permissions
- **Pages** : 13 permissions
- **Autres** : 35 permissions

**Durée estimée** : 10-15 secondes

---

### **ÉTAPE 4️⃣ : Assigner les Permissions au SUPER_ADMIN**

**Script** : `3-assign-all-permissions.js`

**Ce qu'il fait** :
- ✅ Récupère toutes les permissions créées à l'étape 2
- ✅ Les assigne au rôle SUPER_ADMIN
- ✅ Les assigne à l'utilisateur super admin

**Commande** :
```bash
node "scripts/database/3-assign-all-permissions.js"
```

**Résultat** :
- ✅ 321 permissions assignées au rôle SUPER_ADMIN
- ✅ 321 permissions assignées à l'utilisateur `admin@ebvision.com`

**Durée estimée** : 3-5 secondes

---

## 🎉 **C'est Terminé !**

Votre base de données est maintenant **100% opérationnelle** !

### **🔑 Identifiants de Connexion**

**Méthode Complète (`0-init-complete.js`) :**
```
📧 Email       : admin@ebvision.com
🔑 Mot de passe: Admin@2025
```

**Méthode Modulaire (`2-create-super-admin.js`) :**
```
Vous avez choisi l'email et le mot de passe lors de l'exécution
```

### **🚀 Démarrer l'Application**

```bash
npm start
```

Ouvrez votre navigateur à : **http://localhost:3000/login.html**

---

## 📊 Résumé des Données Créées

| Élément | Quantité | Détails |
|---------|----------|---------|
| **Tables** | 81 | Structure complète |
| **Rôles** | 11 | 7 système + 4 non-système |
| **Permissions** | 321 | 20 catégories |
| **Super Admin** | 1 | Accès complet à tout |

---

## 🔄 Scripts Modulaires (Optionnel)

Si vous préférez une approche **modulaire** au lieu du script tout-en-un :

### **Option A : Tout-en-un (Recommandé)**
```bash
# Une seule commande fait TOUT
node scripts/database/0-init-complete.js
```

### **Option B : Modulaire (Pour plus de contrôle)**
```bash
# 1. Créer les tables et rôles
node scripts/database/1-init-database-tables.js

# 2. Créer le super admin
node scripts/database/2-create-super-admin.js

# 3. Créer les permissions
node scripts/database/sync-all-permissions-complete.js

# 4. Assigner les permissions
node scripts/database/3-assign-all-permissions.js
```

---

## 🎯 Scripts Utiles Supplémentaires

### **Générer des Données de Démo**
Si vous voulez des données de test (utilisateurs, clients, missions, etc.) :
```bash
node "scripts/database/4-generate-demo-data.js"
```

### **Corriger/Mettre à Jour le Schéma**
Si vous devez appliquer des correctifs au schéma :
```bash
node "scripts/database/5-fix-database-schema.sql"
```

### **Réinitialiser Complètement**
Pour supprimer et recréer la base de données :
```bash
# ATTENTION : Supprime TOUTES les données !
node "scripts/database/0-reset-database.js"
```

---

## 🆘 Dépannage

### **Problème : Erreur de connexion**
```
❌ connection to server failed
```
**Solution** : Vérifiez que PostgreSQL est démarré et que le `.env` est correct.

### **Problème : Base de données existe déjà**
```
❌ La base de données existe déjà
```
**Solution** : 
1. **Réinitialiser** : Choisissez "Réinitialiser" dans le script
2. **Ou** : Changez `DB_NAME` dans `.env` pour créer une nouvelle base

### **Problème : Rôle SUPER_ADMIN non trouvé (étape 3)**
```
❌ Rôle SUPER_ADMIN non trouvé
```
**Solution** : Exécutez d'abord l'étape 1 (`0- init-from-schema.js`)

### **Problème : Permissions non créées (étape 3)**
```
❌ Aucune permission trouvée
```
**Solution** : Exécutez d'abord l'étape 2 (`sync-all-permissions-complete.js`)

---

## 📝 Notes Importantes

### **Base de Données Pure**
- Le schéma est basé sur **`backup_BD_reference.sql`** (base pure testée)
- Les extensions ajoutées :
  - **Badges de rôles** : couleurs et priorités
  - Structure complète et stable

### **Compatibilité**
- ✅ Compatible avec la version de production
- ✅ Structure conforme à la base pure
- ✅ Prêt pour la vente à d'autres entreprises

### **Sécurité**
- 🔐 Mot de passe par défaut : **À CHANGER immédiatement après la première connexion**
- 🔐 Utilisez un mot de passe fort pour la production
- 🔐 Le super admin a **accès complet** à tout

---

## 🎓 Comprendre les Rôles

### **Rôles Système (is_system_role = true)**
Ces rôles sont **essentiels** au fonctionnement de l'application et ne peuvent pas être supprimés :

1. **SUPER_ADMIN** (Priorité 100) 🔴
   - Accès absolu à tout
   - Gestion des permissions
   - Configuration système

2. **ADMIN_IT** (Priorité 95) ⚫
   - Administration technique
   - Gestion infrastructure

3. **IT** (Priorité 92) 🔘
   - Support technique

4. **ADMIN** (Priorité 90) 🔵
   - Administration fonctionnelle
   - Gestion des utilisateurs

5. **MANAGER** (Priorité 70) 💧
   - Gestion d'équipe
   - Validation

6. **CONSULTANT** (Priorité 60) 🟢
   - Accès consultant

7. **COLLABORATEUR** (Priorité 50) ⚪
   - Utilisateur de base

### **Rôles Non-Système (is_system_role = false)**
Ces rôles peuvent être **modifiés ou supprimés** selon les besoins :

1. **ASSOCIE** (Priorité 85) 🟡
2. **DIRECTEUR** (Priorité 80) 🟠
3. **SUPER_USER** (Priorité 75) 🟣
4. **SUPERVISEUR** (Priorité 65) 🔷

---

## 📞 Support

Pour toute question ou problème :
1. Consultez les logs de la console
2. Vérifiez la structure avec `\dt` dans `psql`
3. Consultez `RESUME-CORRECTIONS-BASE-PURE.md` pour l'historique des corrections

---

**Dernière mise à jour** : Novembre 2025  
**Version de la base** : Conforme à `backup_BD_reference.sql` + Extensions badges

