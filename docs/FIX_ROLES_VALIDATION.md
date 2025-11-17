# 🔧 Correction - Validation du Champ `roles`

**Date:** Octobre 2025  
**Problème:** Erreur 400 (Bad Request) lors de la mise à jour des rôles d'un utilisateur

---

## ❌ **PROBLÈME IDENTIFIÉ**

### **Symptôme :**
```
PUT http://localhost:3000/api/users/9fbeeb55-fdaf-4deb-b5bc-ff610fddb78b 400 (Bad Request)
```

### **Cause :**
Le schéma de validation Joi dans `src/utils/validators.js` n'acceptait pas le champ `roles` (tableau d'UUIDs) lors de la mise à jour d'un utilisateur.

**Données envoyées par le frontend :**
```javascript
{
    login: 'ebela',
    roles: ['4cfc8a99-a51c-4cfd-9499-4741a58910ed', 'acc4927f-fd8c-4d91-9d08-398a35e2cb34'],
    password: '#Canaan@2020'
}
```

**Schéma de validation (AVANT) :**
```javascript
update: Joi.object({
    nom: Joi.string().min(2).max(50),
    prenom: Joi.string().min(2).max(50),
    email: Joi.string().email(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).optional(),
    login: Joi.string().min(3).max(50),
    role: Joi.string(),  // ← Ancien champ (rôle unique)
    statut: Joi.string().valid('ACTIF', 'INACTIF', 'CONGE')
})
```

**Résultat :** Le champ `roles` était **rejeté** par la validation Joi car non défini dans le schéma.

---

## ✅ **SOLUTION APPLIQUÉE**

### **Modification apportée :**

Ajout du champ `roles` au schéma de validation `userValidation.update` :

```javascript
update: Joi.object({
    nom: Joi.string().min(2).max(50)
        .messages({
            'string.min': 'Le nom doit contenir au moins 2 caractères',
            'string.max': 'Le nom ne peut pas dépasser 50 caractères'
        }),
    prenom: Joi.string().min(2).max(50)
        .messages({
            'string.min': 'Le prénom doit contenir au moins 2 caractères',
            'string.max': 'Le prénom ne peut pas dépasser 50 caractères'
        }),
    email: Joi.string().email()
        .messages({
            'string.email': 'Format d\'email invalide'
        }),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).optional()
        .messages({
            'string.min': 'Le mot de passe doit contenir au moins 8 caractères',
            'string.pattern.base': 'Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial (@$!%*?&)'
        }),
    login: Joi.string().min(3).max(50)
        .messages({
            'string.min': 'Le login doit contenir au moins 3 caractères',
            'string.max': 'Le login ne peut pas dépasser 50 caractères'
        }),
    role: Joi.string()
        .messages({
            'string.base': 'Le rôle doit être une chaîne de caractères'
        }),
    // 🆕 NOUVEAU CHAMP AJOUTÉ
    roles: Joi.array().items(Joi.string().uuid()).min(1)
        .messages({
            'array.base': 'Les rôles doivent être un tableau',
            'array.min': 'Au moins un rôle doit être sélectionné',
            'string.guid': 'Format de rôle invalide (UUID requis)'
        }),
    statut: Joi.string().valid('ACTIF', 'INACTIF', 'CONGE')
        .messages({
            'any.only': 'Statut invalide'
        })
})
```

---

## 📋 **DÉTAILS DE LA VALIDATION**

### **Champ `roles` :**

```javascript
roles: Joi.array().items(Joi.string().uuid()).min(1)
```

**Contraintes :**
- ✅ **Type :** Tableau (`array`)
- ✅ **Items :** Chaque élément doit être un **UUID** (format UUID v4)
- ✅ **Minimum :** Au moins **1 rôle** requis (`.min(1)`)
- ✅ **Optionnel :** Le champ peut être omis (pas de `.required()`)

**Messages d'erreur personnalisés :**
```javascript
.messages({
    'array.base': 'Les rôles doivent être un tableau',
    'array.min': 'Au moins un rôle doit être sélectionné',
    'string.guid': 'Format de rôle invalide (UUID requis)'
})
```

---

## 🔄 **FLUX DE VALIDATION**

### **1. Frontend → Backend**

**Frontend (users.html) :**
```javascript
const selectedRoles = getSelectedRoles();  // ['uuid1', 'uuid2']
const formData = {
    login: 'ebela',
    roles: selectedRoles,
    password: '#Canaan@2020'
};

await fetch('/api/users/:id', {
    method: 'PUT',
    body: JSON.stringify(formData)
});
```

### **2. Backend - Validation (src/routes/users.js)**

```javascript
router.put('/:id', authenticateToken, requirePermission('users:update'), async (req, res) => {
    try {
        // 1. Validation Joi
        const { error, value } = userValidation.update.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: error.details.map(detail => detail.message)
            });
        }
        
        // 2. Mise à jour de l'utilisateur
        const updatedUser = await User.update(id, value);
        
        // 3. Gestion des rôles multiples
        if (req.body.roles && Array.isArray(req.body.roles)) {
            await pool.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
            
            const insertValues = req.body.roles.map((roleId, index) => 
                `($1, $${index + 2}, NOW())`
            ).join(', ');
            
            const insertQuery = `
                INSERT INTO user_roles (user_id, role_id, created_at)
                VALUES ${insertValues}
            `;
            
            await pool.query(insertQuery, [id, ...req.body.roles]);
        }
        
        res.json({
            success: true,
            message: 'Utilisateur mis à jour avec succès',
            data: updatedUser
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});
```

---

## 🧪 **EXEMPLES DE VALIDATION**

### **✅ Valide :**

```javascript
// 1 rôle
{
    roles: ['4cfc8a99-a51c-4cfd-9499-4741a58910ed']
}

// 2 rôles
{
    roles: [
        '4cfc8a99-a51c-4cfd-9499-4741a58910ed',
        'acc4927f-fd8c-4d91-9d08-398a35e2cb34'
    ]
}

// Omission du champ (optionnel)
{
    login: 'newlogin'
}
```

### **❌ Invalide :**

```javascript
// Tableau vide
{
    roles: []
}
// ❌ Erreur: "Au moins un rôle doit être sélectionné"

// Format invalide (pas UUID)
{
    roles: ['ADMIN', 'MANAGER']
}
// ❌ Erreur: "Format de rôle invalide (UUID requis)"

// Type invalide (pas tableau)
{
    roles: 'ADMIN'
}
// ❌ Erreur: "Les rôles doivent être un tableau"
```

---

## 📊 **IMPACT**

### **Avant la correction :**
```
❌ Mise à jour des rôles → 400 Bad Request
❌ Impossibilité d'assigner plusieurs rôles
❌ Système de rôles multiples non fonctionnel
```

### **Après la correction :**
```
✅ Mise à jour des rôles → 200 OK
✅ Assignation de plusieurs rôles possible
✅ Système de rôles multiples pleinement opérationnel
```

---

## 🔗 **FICHIERS MODIFIÉS**

1. **`src/utils/validators.js`**
   - Ajout du champ `roles` dans `userValidation.update`
   - Validation: `Joi.array().items(Joi.string().uuid()).min(1)`

---

## 🎯 **COMPATIBILITÉ**

### **Rétrocompatibilité :**

Le champ `role` (ancien système) est **conservé** pour assurer la compatibilité avec l'ancien code :

```javascript
role: Joi.string()  // ← Conservé pour compatibilité
    .messages({
        'string.base': 'Le rôle doit être une chaîne de caractères'
    }),
roles: Joi.array().items(Joi.string().uuid()).min(1)  // ← Nouveau système
```

**Comportement :**
- Si `roles` est fourni → Utilise le système de rôles multiples
- Si `role` est fourni (ancien) → Compatible mais déprécié
- Les deux peuvent coexister durant la transition

---

## ✅ **VÉRIFICATION**

### **Test manuel :**

1. Ouvrir `/users.html`
2. Cliquer sur "Gérer le compte" d'un utilisateur
3. Sélectionner 2 rôles ou plus
4. Cliquer sur "Mettre à jour"
5. **Résultat attendu :** ✅ Succès (pas d'erreur 400)

### **Test avec console :**

```javascript
// Dans la console du navigateur
const selectedRoles = getSelectedRoles();
console.log('Rôles sélectionnés:', selectedRoles);
// → ['uuid1', 'uuid2']

// Après sauvegarde
console.log('Mise à jour réussie');
```

---

**✅ Correction appliquée et testée avec succès !**























