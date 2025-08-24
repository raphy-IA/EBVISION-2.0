# 🔐 GUIDE DE GESTION DES COMPTES UTILISATEURS LIÉS AUX COLLABORATEURS

## 📋 **PROBLÈME IDENTIFIÉ**

### **Symptômes :**
- Un collaborateur ne peut pas se connecter car "compte désactivé"
- Le compte utilisateur n'apparaît pas dans la page de gestion des utilisateurs (`users.html`)
- Le modal de gestion des comptes affiche bien le login, mais le compte est invisible

### **Causes possibles :**
1. **Compte utilisateur INACTIF** → Le collaborateur ne peut pas se connecter
2. **Filtrage par défaut** → La page users.html ne montre que les utilisateurs actifs par défaut
3. **Liaison incorrecte** → Problème entre les tables `users` et `collaborateurs`

## ✅ **SOLUTION APPLIQUÉE POUR ALYSSA MOLOM**

### **Diagnostic :**
```
18. Alyssa Molom
   Email: amolom@eb-partnersgroup.cm
   Login: amolom
   Rôle: MANAGER
   Statut: INACTIF  ← PROBLÈME IDENTIFIÉ !
   Type: 🔗 Lié à collaborateur
   Collaborateur: Alyssa Molom
```

### **Actions correctives :**
1. ✅ **Activation du compte** : `statut = 'ACTIF'`
2. ✅ **Vérification de la liaison** : `collaborateur_id` correctement défini
3. ✅ **Synchronisation bidirectionnelle** : `user_id` dans collaborateurs

## 🎯 **COMMENT RÉSOUDRE CE TYPE DE PROBLÈME**

### **Étape 1 : Diagnostic**
```bash
# Exécuter le script de vérification
node check-users-with-collaborateurs.js
```

### **Étape 2 : Identification du problème**
- **Compte INACTIF** → Activer le compte
- **Liaison manquante** → Corriger les relations
- **Compte manquant** → Créer le compte utilisateur

### **Étape 3 : Correction**
```bash
# Pour un cas spécifique (exemple Alyssa Molom)
node fix-alyssa-molom-account.js
```

### **Étape 4 : Vérification**
- Tester la connexion du collaborateur
- Vérifier l'apparition dans la page users.html
- Contrôler les permissions et rôles

## 🔍 **UTILISATION DE LA PAGE DE GESTION DES UTILISATEURS**

### **Filtres disponibles :**
1. **"Utilisateurs actifs"** (par défaut) → Seulement `statut = 'ACTIF'`
2. **"Utilisateurs supprimés"** → Seulement `statut = 'INACTIF'`
3. **"Tous les utilisateurs"** → Tous les statuts

### **Pour voir un compte INACTIF :**
1. Aller sur `/users.html`
2. Changer le filtre "Affichage" à **"Tous les utilisateurs"**
3. Le compte devrait maintenant apparaître

### **Actions disponibles sur les comptes liés :**
- 🔧 **Gérer le compte** → Modal de gestion spécifique
- 👤 **Voir le collaborateur** → Redirection vers le profil collaborateur
- ⏸️ **Désactiver** → Mettre le compte en INACTIF
- 🗑️ **Supprimer** → Suppression définitive (si pas lié)

## 📊 **STRUCTURE DE LA BASE DE DONNÉES**

### **Tables impliquées :**
```sql
-- Table des utilisateurs
users (
    id UUID PRIMARY KEY,
    nom VARCHAR,
    prenom VARCHAR,
    email VARCHAR,
    login VARCHAR,
    role VARCHAR,
    statut VARCHAR, -- 'ACTIF' ou 'INACTIF'
    collaborateur_id UUID REFERENCES collaborateurs(id)
)

-- Table des collaborateurs
collaborateurs (
    id UUID PRIMARY KEY,
    nom VARCHAR,
    prenom VARCHAR,
    email VARCHAR,
    user_id UUID REFERENCES users(id)
)
```

### **Relations :**
- **One-to-One** : Un utilisateur ↔ Un collaborateur
- **Bidirectionnelle** : `users.collaborateur_id` ↔ `collaborateurs.user_id`
- **Optionnelle** : Un collaborateur peut exister sans compte utilisateur

## 🚨 **PROBLÈMES COURANTS ET SOLUTIONS**

### **1. Compte INACTIF**
```sql
-- Solution
UPDATE users SET statut = 'ACTIF' WHERE login = 'login_du_collaborateur';
```

### **2. Liaison manquante**
```sql
-- Solution
UPDATE users SET collaborateur_id = 'uuid_collaborateur' WHERE id = 'uuid_utilisateur';
UPDATE collaborateurs SET user_id = 'uuid_utilisateur' WHERE id = 'uuid_collaborateur';
```

### **3. Compte utilisateur inexistant**
```javascript
// Utiliser le service de création automatique
const UserAccessService = require('./src/services/userAccessService');
await UserAccessService.createUserAccessForCollaborateur(collaborateurData);
```

## 📝 **SCRIPTS UTILITAIRES DISPONIBLES**

### **Diagnostic :**
- `check-users-with-collaborateurs.js` → Vue d'ensemble des liaisons
- `check-cyrille-collaborateur.js` → Vérification spécifique

### **Correction :**
- `fix-alyssa-molom-account.js` → Correction spécifique (exemple)
- `fix-user-collaborateur-relation.js` → Correction générale
- `fix-missing-user-accounts.js` → Création de comptes manquants

### **Création automatique :**
- `create-user-access.js` → Création d'accès pour nouveaux collaborateurs

## 🎯 **BONNES PRATIQUES**

### **Lors de la création d'un collaborateur :**
1. ✅ Créer automatiquement le compte utilisateur
2. ✅ Définir les liaisons bidirectionnelles
3. ✅ Configurer les permissions appropriées
4. ✅ Envoyer les identifiants de connexion

### **Lors de la désactivation :**
1. ⚠️ Désactiver le compte utilisateur (soft delete)
2. ⚠️ Conserver les données historiques
3. ⚠️ Notifier le collaborateur

### **Lors de la suppression :**
1. 🗑️ Vérifier qu'aucune donnée critique n'est liée
2. 🗑️ Supprimer définitivement si nécessaire
3. 🗑️ Nettoyer les relations

## ✅ **RÉSULTAT ATTENDU**

Après correction, le collaborateur devrait pouvoir :
- ✅ Se connecter avec son login/email
- ✅ Accéder à toutes ses fonctionnalités
- ✅ Apparaître dans la page de gestion des utilisateurs
- ✅ Avoir un profil collaborateur correctement lié

---

**Note :** Ce guide couvre les problèmes les plus courants. Pour des cas spécifiques, utiliser les scripts de diagnostic appropriés. 