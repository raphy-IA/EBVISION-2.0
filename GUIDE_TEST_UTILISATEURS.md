# 🧪 GUIDE DE TEST - GESTION DES UTILISATEURS

## ✅ **FONCTIONNALITÉS IMPLÉMENTÉES**

### **1. Distinction des types d'utilisateurs**
- ✅ **Utilisateurs liés** : Créés automatiquement avec les collaborateurs
- ✅ **Utilisateurs libres** : Créés manuellement
- ✅ **Affichage différencié** : Couleurs et badges distincts

### **2. Actions disponibles**

#### **Pour les utilisateurs actifs :**
- ✅ **Modifier** : Champs adaptés selon le type
- ✅ **Désactiver** : Soft delete (statut = 'INACTIF')
- ✅ **Supprimer** : Hard delete (uniquement pour les utilisateurs libres)

#### **Pour les utilisateurs désactivés :**
- ✅ **Activer** : Restaurer le statut à 'ACTIF'

### **3. Filtres et recherche**
- ✅ **Recherche** : Nom, prénom, email, login
- ✅ **Filtre par rôle** : ADMIN, USER, etc.
- ✅ **Filtre par statut** : ACTIF, INACTIF
- ✅ **Filtre par type** : Liés à collaborateur / Libres
- ✅ **Filtre d'affichage** : Actifs / Désactivés / Tous

## 🧪 **COMMENT TESTER**

### **Étape 1 : Accéder à l'interface**
1. Ouvrez `http://localhost:3000/users.html`
2. Connectez-vous avec un utilisateur existant

### **Étape 2 : Tester la distinction des types**
1. **Observez** les utilisateurs avec badges "Lié" ou "Libre"
2. **Vérifiez** que les utilisateurs liés ont un fond bleu
3. **Notez** les messages "(via collaborateur)" pour les champs liés

### **Étape 3 : Tester la modification**
1. **Cliquez** sur "Modifier" pour un utilisateur lié
2. **Vérifiez** que nom/prénom/email sont désactivés
3. **Testez** la modification d'un utilisateur libre (tous les champs actifs)

### **Étape 4 : Tester la désactivation**
1. **Cliquez** sur "Désactiver" (bouton pause)
2. **Confirmez** dans le modal
3. **Vérifiez** que l'utilisateur disparaît de la liste "Actifs"
4. **Changez** le filtre vers "Désactivés" pour le voir

### **Étape 5 : Tester la suppression**
1. **Trouvez** un utilisateur libre (non lié)
2. **Cliquez** sur "Supprimer" (bouton poubelle)
3. **Confirmez** dans le modal
4. **Vérifiez** que l'utilisateur disparaît définitivement

### **Étape 6 : Tester la restauration**
1. **Allez** dans "Utilisateurs désactivés"
2. **Cliquez** sur "Activer" (bouton play)
3. **Vérifiez** que l'utilisateur réapparaît dans "Actifs"

## 🔧 **FONCTIONNALITÉS TECHNIQUES**

### **API Endpoints :**
- `GET /api/users` : Liste avec filtres
- `PUT /api/users/:id` : Modification
- `PATCH /api/users/:id/deactivate` : Désactivation
- `DELETE /api/users/:id` : Suppression définitive

### **Sécurité :**
- ✅ **Vérification des liens** : Impossible de supprimer un utilisateur lié
- ✅ **Soft delete** : Désactivation réversible
- ✅ **Hard delete** : Suppression définitive uniquement pour les libres

### **Interface :**
- ✅ **Modals de confirmation** : Pour désactivation et suppression
- ✅ **Messages d'erreur** : Détail des erreurs
- ✅ **Indicateurs visuels** : Couleurs et badges
- ✅ **Filtres combinés** : Recherche + type + statut

## 🎯 **RÉSULTAT ATTENDU**

Vous devriez maintenant avoir :
1. **Distinction claire** entre utilisateurs liés et libres
2. **Actions appropriées** selon le type d'utilisateur
3. **Désactivation réversible** pour tous les utilisateurs
4. **Suppression définitive** uniquement pour les utilisateurs libres
5. **Interface intuitive** avec filtres et confirmations

## 🚨 **POINTS D'ATTENTION**

- **Utilisateurs liés** : Ne peuvent pas être supprimés définitivement
- **Désactivation** : Conserve toutes les données
- **Suppression** : Irréversible, supprime définitivement de la base
- **Filtres** : Se combinent entre eux pour un affichage précis

**Testez maintenant dans le navigateur !** 🚀 