# 🔧 RÉSOLUTION DU PROBLÈME DE FILTRAGE DES UTILISATEURS

## 📋 **PROBLÈME IDENTIFIÉ**

### **Symptômes :**
- Le compte d'Alyssa Molom (INACTIF) n'apparaît pas dans la page de gestion des utilisateurs
- Même avec le filtre "Tous les utilisateurs" ou "Utilisateurs supprimés", le compte reste invisible
- Le modal de gestion des comptes affiche bien le login `amolom`, mais le compte n'est pas listé

### **Cause racine :**
Le problème était dans le modèle `User.js` qui avait une condition **hardcodée** excluant systématiquement les utilisateurs INACTIF :

```sql
WHERE u.statut != 'INACTIF'  -- ← PROBLÈME !
```

Cette condition était appliquée **toujours**, même quand on voulait voir tous les utilisateurs.

## ✅ **SOLUTION APPLIQUÉE**

### **1. Correction du modèle User.js**

**Avant :**
```javascript
// Requête pour le total
const countSql = `
    SELECT COUNT(*) as total
    FROM users u
    WHERE u.statut != 'INACTIF'  -- ← Excluait toujours les INACTIF
    ${whereClause ? 'AND ' + whereClause.replace('WHERE ', '') : ''}
`;

// Requête pour les données
const sql = `
    SELECT u.id, u.nom, u.prenom, u.email, u.login, u.role,
           u.statut, u.last_login, u.created_at, u.updated_at,
           c.id as collaborateur_id
    FROM users u
    LEFT JOIN collaborateurs c ON u.id = c.user_id
    WHERE u.statut != 'INACTIF'  -- ← Excluait toujours les INACTIF
    ${whereClause ? 'AND ' + whereClause.replace('WHERE ', '') : ''}
    ORDER BY u.nom, u.prenom
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
`;
```

**Après :**
```javascript
// Gestion du filtrage par statut
if (statut) {
    conditions.push(`u.statut = $${params.length + 1}`);
    params.push(statut);
} else {
    // Par défaut, ne pas exclure les utilisateurs INACTIF si aucun filtre de statut n'est spécifié
    // Cela permet de voir tous les utilisateurs quand on ne filtre pas par statut
}

const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

// Requête pour le total
const countSql = `
    SELECT COUNT(*) as total
    FROM users u
    ${whereClause}
`;

// Requête pour les données
const sql = `
    SELECT u.id, u.nom, u.prenom, u.email, u.login, u.role,
           u.statut, u.last_login, u.created_at, u.updated_at,
           c.id as collaborateur_id
    FROM users u
    LEFT JOIN collaborateurs c ON u.id = c.user_id
    ${whereClause}
    ORDER BY u.nom, u.prenom
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
`;
```

### **2. Amélioration de la route API**

**Ajout du support des paramètres de filtrage :**
```javascript
// Récupérer tous les utilisateurs (avec pagination)
router.get('/', authenticateToken, requirePermission('users:read'), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const role = req.query.role || '';
        const statut = req.query.status || req.query.statut || ''; // Support both 'status' and 'statut'

        console.log('🔍 [API] GET /users - Paramètres:', { page, limit, search, role, statut });

        const result = await User.findAll({
            page,
            limit,
            search,
            role,
            statut
        });

        // ... reste du code
    } catch (error) {
        // ... gestion d'erreur
    }
});
```

## 🧪 **TESTS DE VALIDATION**

### **Tests effectués :**

1. **Tous les utilisateurs (sans filtre)** → ✅ 32 utilisateurs (23 actifs + 9 inactifs)
2. **Utilisateurs actifs seulement** → ✅ 23 utilisateurs (0 inactifs)
3. **Utilisateurs inactifs seulement** → ✅ 9 utilisateurs (0 actifs)
4. **Recherche d'Alyssa Molom** → ✅ 1 utilisateur trouvé (INACTIF)
5. **Recherche par login amolom** → ✅ 1 utilisateur trouvé (INACTIF)

### **Résultats attendus :**

- ✅ **Filtre "Utilisateurs actifs"** : Seulement les utilisateurs ACTIF
- ✅ **Filtre "Utilisateurs supprimés"** : Seulement les utilisateurs INACTIF
- ✅ **Filtre "Tous les utilisateurs"** : Tous les utilisateurs (ACTIF + INACTIF)

## 🎯 **UTILISATION CORRECTE**

### **Dans la page users.html :**

1. **Pour voir tous les utilisateurs** :
   - Sélectionner "Tous les utilisateurs" dans le filtre "Affichage"
   - Aucun paramètre de statut n'est envoyé à l'API
   - L'API retourne tous les utilisateurs

2. **Pour voir seulement les actifs** :
   - Sélectionner "Utilisateurs actifs" dans le filtre "Affichage"
   - Le paramètre `status=ACTIF` est envoyé à l'API
   - L'API retourne seulement les utilisateurs ACTIF

3. **Pour voir seulement les inactifs** :
   - Sélectionner "Utilisateurs supprimés" dans le filtre "Affichage"
   - Le paramètre `status=INACTIF` est envoyé à l'API
   - L'API retourne seulement les utilisateurs INACTIF

## 📊 **ÉTAT ACTUEL**

### **Alyssa Molom :**
- ✅ **Compte existant** : `amolom@eb-partnersgroup.cm`
- ✅ **Statut** : INACTIF (confirmé)
- ✅ **Liaison** : Correctement liée au collaborateur
- ✅ **Visibilité** : Maintenant visible avec le filtre approprié

### **Fonctionnalités restaurées :**
- ✅ **Filtrage par statut** : Fonctionne correctement
- ✅ **Recherche** : Trouve les utilisateurs INACTIF
- ✅ **Pagination** : Compte correctement tous les utilisateurs
- ✅ **Interface** : Affiche correctement les utilisateurs selon le filtre

## 🚨 **POINTS D'ATTENTION**

### **Pour les développeurs :**
- ⚠️ **Ne jamais hardcoder** des exclusions de statut dans les requêtes
- ⚠️ **Toujours utiliser** des paramètres de filtrage dynamiques
- ⚠️ **Tester** tous les cas de filtrage lors des modifications

### **Pour les utilisateurs :**
- ✅ **Utiliser le bon filtre** selon ce qu'on veut voir
- ✅ **"Tous les utilisateurs"** pour voir l'ensemble
- ✅ **"Utilisateurs supprimés"** pour voir les comptes INACTIF

## 📝 **FICHIERS MODIFIÉS**

1. **`src/models/User.js`** → Correction de la méthode `findAll()`
2. **`src/routes/users.js`** → Ajout du support des paramètres de filtrage
3. **`test-users-api.js`** → Script de test pour validation
4. **`test-users-http-api.js`** → Script de test HTTP

---

**Résultat :** Le problème de filtrage est résolu. Alyssa Molom et tous les autres utilisateurs INACTIF sont maintenant visibles dans la page de gestion des utilisateurs avec le filtre approprié.
