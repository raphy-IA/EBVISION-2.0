# 🔧 **GUIDE DE TEST - CORRECTIONS UTILISATEURS**

## ✅ **PROBLÈMES CORRIGÉS**

### **1. Erreur 500 - Statistiques utilisateurs**
- ✅ **Problème** : `error: la colonne « grade » n'existe pas`
- ✅ **Cause** : La méthode `getStats()` référençait une colonne `grade` inexistante
- ✅ **Solution** : Remplacé par `role` qui existe dans la table `users`

### **2. Erreur 400 - Modification d'utilisateur**
- ✅ **Problème** : `Failed to load resource: the server responded with a status of 400 (Bad Request)`
- ✅ **Cause** : Le schéma de validation `update` ne permettait pas le mot de passe
- ✅ **Solution** : Ajouté `password` au schéma de validation et à la méthode `update`

## 🧪 **COMMENT TESTER LES CORRECTIONS**

### **Étape 1 : Vérifier les statistiques**
1. **Allez** sur `http://localhost:3000/users.html`
2. **Vérifiez** que les statistiques se chargent sans erreur
3. **Contrôlez** que les cartes de statistiques affichent des données

### **Étape 2 : Tester la modification d'utilisateur libre**
1. **Trouvez** un utilisateur libre (badge "Libre")
2. **Cliquez** sur "Modifier" (icône `edit`)
3. **Modifiez** le login (ex: "nouveau_login")
4. **Entrez** un nouveau mot de passe (ex: "NouveauPass123!")
5. **Changez** le rôle (ex: de USER à MANAGER)
6. **Cliquez** sur "Mettre à jour"
7. **Vérifiez** que la modification réussit sans erreur 400

### **Étape 3 : Tester la modification d'utilisateur lié**
1. **Trouvez** un utilisateur lié (badge "Lié")
2. **Cliquez** sur "Gérer le compte" (icône `user-shield`)
3. **Vérifiez** que le modal s'ouvre avec :
   - Note explicative en haut
   - Champs nom/prénom/email désactivés
   - Champs login/mot de passe/rôle actifs
4. **Modifiez** le login (ex: "nouveau_login_lie")
5. **Entrez** un nouveau mot de passe (ex: "NouveauPass123!")
6. **Changez** le rôle (ex: de USER à SENIOR)
7. **Cliquez** sur "Mettre à jour"
8. **Vérifiez** que la modification réussit sans erreur 400

### **Étape 4 : Vérifier les logs serveur**
1. **Ouvrez** la console du serveur
2. **Vérifiez** qu'il n'y a plus d'erreurs :
   - ❌ `error: la colonne « grade » n'existe pas`
   - ❌ `Failed to load resource: the server responded with a status of 400`

## 🔧 **CORRECTIONS TECHNIQUES**

### **1. Correction des statistiques (`src/models/User.js`)**
```javascript
// AVANT (ligne 405)
COUNT(CASE WHEN grade = 'ASSISTANT' THEN 1 END) as assistants,

// APRÈS
COUNT(CASE WHEN role = 'ASSISTANT' THEN 1 END) as assistants,
```

### **2. Ajout du mot de passe au schéma de validation (`src/utils/validators.js`)**
```javascript
update: Joi.object({
    // ... autres champs
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).optional()
        .messages({
            'string.min': 'Le mot de passe doit contenir au moins 8 caractères',
            'string.pattern.base': 'Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial'
        }),
    // ... autres champs
})
```

### **3. Gestion du mot de passe dans la méthode update (`src/models/User.js`)**
```javascript
// Gérer le mot de passe séparément
if (updateData.password) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    passwordHash = await bcrypt.hash(updateData.password, saltRounds);
    updates.push(`password_hash = $${paramIndex}`);
    values.push(passwordHash);
    paramIndex++;
}
```

## 🎯 **RÉSULTAT ATTENDU**

Après les corrections, vous devriez avoir :
1. ✅ **Statistiques fonctionnelles** : Plus d'erreur 500 sur `/api/users/statistics`
2. ✅ **Modification d'utilisateurs libres** : Plus d'erreur 400 sur la mise à jour
3. ✅ **Modification d'utilisateurs liés** : Gestion de compte fonctionnelle
4. ✅ **Gestion du mot de passe** : Hashage correct lors des modifications

## 🚨 **POINTS D'ATTENTION**

- **Mot de passe** : Doit respecter le pattern (8+ caractères, minuscule, majuscule, chiffre, spécial)
- **Utilisateurs liés** : Seuls login, mot de passe et rôle modifiables
- **Utilisateurs libres** : Tous les champs modifiables
- **Hashage** : Les mots de passe sont automatiquement hashés avec bcrypt

## 📋 **TEST DE VALIDATION**

### **Test 1 : Statistiques**
- [ ] Page `users.html` charge sans erreur
- [ ] Cartes de statistiques affichent des données
- [ ] Pas d'erreur 500 dans la console

### **Test 2 : Utilisateur libre**
- [ ] Bouton "Modifier" fonctionne
- [ ] Modification du login réussit
- [ ] Modification du mot de passe réussit
- [ ] Modification du rôle réussit
- [ ] Pas d'erreur 400

### **Test 3 : Utilisateur lié**
- [ ] Bouton "Gérer le compte" fonctionne
- [ ] Modal avec note explicative
- [ ] Champs nom/prénom/email désactivés
- [ ] Modification du login réussit
- [ ] Modification du mot de passe réussit
- [ ] Modification du rôle réussit
- [ ] Pas d'erreur 400

**Testez maintenant dans le navigateur !** 🚀 