# 🔒 Implémentation Complète de la Sécurité SUPER_ADMIN

**Date** : 2 octobre 2025  
**Version** : 2.0 - Implémentation complète

---

## 📊 Vue d'Ensemble

Ce document décrit les mesures de sécurité **implémentées** pour protéger le rôle `SUPER_ADMIN` et ses privilèges.

### ✅ Mesures Implémentées

| # | Mesure | Priorité | Statut |
|---|--------|----------|--------|
| 1 | Protection modification/suppression | 🔴 Critique | ✅ Implémenté |
| 2 | Empêcher l'auto-dégradation | 🔴 Critique | ✅ Implémenté |
| 3 | Audit log renforcé | 🟠 Haute | ✅ Implémenté |
| 4 | Rate limiting | 🟠 Haute | ✅ Implémenté |
| 5 | Masquage rôle/utilisateurs | 🟠 Haute | ✅ Implémenté |
| 6 | Protection permissions sensibles | 🟠 Haute | ✅ Implémenté |

---

## 🛠️ Fichiers Créés/Modifiés

### **Nouveaux Fichiers**

1. **`src/utils/superAdminHelper.js`**
   - Utilitaires réutilisables pour la gestion des SUPER_ADMIN
   - Fonctions : `isSuperAdmin()`, `countSuperAdmins()`, `canModifySuperAdmin()`, `canRemoveLastSuperAdmin()`, `logSuperAdminAction()`

2. **`src/middleware/superAdminRateLimiter.js`**
   - Rate limiter spécifique pour les actions sensibles
   - Limite : 50 requêtes / 15 minutes pour les actions SUPER_ADMIN
   - Limite : 5 tentatives / heure pour les accès non autorisés

3. **`migrations/004_create_super_admin_audit_log.sql`**
   - Table d'audit pour les actions SUPER_ADMIN
   - Champs : user_id, action, target_user_id, details, ip_address, user_agent, timestamp
   - 5 index pour optimisation des requêtes

4. **`scripts/run-super-admin-migration.js`**
   - Script pour exécuter la migration de la table d'audit

5. **`docs/SUPER_ADMIN_RESTRICTIONS.md`**
   - Documentation des restrictions de visibilité

6. **`docs/SUPER_ADMIN_SECURITY_IMPLEMENTATION.md`** (ce fichier)
   - Documentation complète de l'implémentation

### **Fichiers Modifiés**

1. **`src/routes/users.js`**
   - Ajout des protections sur PUT `/:id`, DELETE `/:id`, POST `/:id/roles`, DELETE `/:id/roles/:roleId`
   - Intégration du rate limiter
   - Audit log sur toutes les actions sensibles

2. **`src/routes/permissions.js`**
   - Filtrage des rôles `SUPER_ADMIN` pour les non-super-admins
   - Filtrage des utilisateurs `SUPER_ADMIN`
   - Filtrage des permissions sensibles

3. **`src/models/User.js`**
   - Ajout du paramètre `currentUserId` dans `findAll()` pour filtrer les SUPER_ADMIN

---

## 🔐 Protections Implémentées

### **1. Protection Modification/Suppression**

#### **Règle** :
Seul un SUPER_ADMIN peut modifier ou supprimer un autre SUPER_ADMIN.

#### **Implémentation** :
```javascript
// Route: PUT /api/users/:id
const canModify = await canModifySuperAdmin(req.user.id, id);
if (!canModify.allowed) {
    await logSuperAdminAction(
        req.user.id,
        'SUPER_ADMIN_UNAUTHORIZED_MODIFICATION_ATTEMPT',
        id,
        { reason: canModify.reason },
        req
    );
    
    return res.status(403).json({
        success: false,
        message: 'Accès refusé',
        reason: canModify.reason
    });
}
```

#### **Code HTTP** : `403 Forbidden`

#### **Message d'erreur** :
```json
{
    "success": false,
    "message": "Accès refusé",
    "reason": "Seul un SUPER_ADMIN peut modifier un autre SUPER_ADMIN"
}
```

---

### **2. Protection Auto-Dégradation**

#### **Règle** :
Le dernier SUPER_ADMIN du système ne peut pas être supprimé ou dégradé.

#### **Implémentation** :
```javascript
const canRemove = await canRemoveLastSuperAdmin(userId);
if (!canRemove.allowed) {
    await logSuperAdminAction(
        req.user.id,
        'SUPER_ADMIN_LAST_ADMIN_DELETION_ATTEMPT',
        id,
        { reason: canRemove.reason },
        req
    );
    
    return res.status(400).json({
        success: false,
        message: 'Opération interdite',
        reason: canRemove.reason
    });
}
```

#### **Code HTTP** : `400 Bad Request`

#### **Message d'erreur** :
```json
{
    "success": false,
    "message": "Opération interdite",
    "reason": "Impossible de retirer le dernier SUPER_ADMIN. Au moins un SUPER_ADMIN doit toujours exister dans le système."
}
```

---

### **3. Protection Attribution/Révocation Rôle**

#### **Attribution** :
Seul un SUPER_ADMIN peut attribuer le rôle `SUPER_ADMIN` à un autre utilisateur.

```javascript
// Route: POST /api/users/:id/roles
if (roleName === 'SUPER_ADMIN') {
    const isCurrentSuperAdmin = await isSuperAdmin(req.user.id);
    
    if (!isCurrentSuperAdmin) {
        await logSuperAdminAction(
            req.user.id,
            'SUPER_ADMIN_UNAUTHORIZED_ROLE_GRANT_ATTEMPT',
            userId,
            { role: 'SUPER_ADMIN' },
            req
        );
        
        return res.status(403).json({
            success: false,
            message: 'Accès refusé',
            reason: 'Seul un SUPER_ADMIN peut attribuer le rôle SUPER_ADMIN'
        });
    }
}
```

#### **Révocation** :
Seul un SUPER_ADMIN peut retirer le rôle `SUPER_ADMIN`, et le dernier ne peut pas être révoqué.

```javascript
// Route: DELETE /api/users/:id/roles/:roleId
if (roleName === 'SUPER_ADMIN') {
    const isCurrentSuperAdmin = await isSuperAdmin(req.user.id);
    
    if (!isCurrentSuperAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Accès refusé',
            reason: 'Seul un SUPER_ADMIN peut retirer le rôle SUPER_ADMIN'
        });
    }
    
    const canRemove = await canRemoveLastSuperAdmin(userId);
    if (!canRemove.allowed) {
        return res.status(400).json({
            success: false,
            message: 'Opération interdite',
            reason: canRemove.reason
        });
    }
}
```

---

### **4. Audit Log Renforcé**

#### **Table** : `super_admin_audit_log`

#### **Actions Tracées** :

| Action | Description |
|--------|-------------|
| `SUPER_ADMIN_ROLE_GRANTED` | Attribution du rôle SUPER_ADMIN |
| `SUPER_ADMIN_ROLE_REVOKED` | Révocation du rôle SUPER_ADMIN |
| `SUPER_ADMIN_USER_DELETED` | Suppression d'un utilisateur SUPER_ADMIN |
| `SUPER_ADMIN_UNAUTHORIZED_MODIFICATION_ATTEMPT` | Tentative non autorisée de modification |
| `SUPER_ADMIN_UNAUTHORIZED_DELETION_ATTEMPT` | Tentative non autorisée de suppression |
| `SUPER_ADMIN_UNAUTHORIZED_ROLE_GRANT_ATTEMPT` | Tentative non autorisée d'attribution de rôle |
| `SUPER_ADMIN_UNAUTHORIZED_ROLE_REVOKE_ATTEMPT` | Tentative non autorisée de révocation de rôle |
| `SUPER_ADMIN_LAST_ADMIN_DELETION_ATTEMPT` | Tentative de suppression du dernier SUPER_ADMIN |
| `SUPER_ADMIN_LAST_ADMIN_REVOKE_ATTEMPT` | Tentative de révocation du dernier SUPER_ADMIN |

#### **Exemple d'enregistrement** :
```javascript
await logSuperAdminAction(
    req.user.id,                      // ID de l'utilisateur qui effectue l'action
    'SUPER_ADMIN_ROLE_GRANTED',       // Type d'action
    userId,                            // ID de l'utilisateur cible
    { role: 'SUPER_ADMIN' },          // Détails supplémentaires
    req                                // Request object (pour IP et user-agent)
);
```

#### **Requête SQL pour consulter l'audit** :
```sql
SELECT 
    aal.timestamp,
    aal.action,
    u1.nom || ' ' || u1.prenom as user_acteur,
    u2.nom || ' ' || u2.prenom as user_cible,
    aal.details,
    aal.ip_address
FROM super_admin_audit_log aal
JOIN users u1 ON aal.user_id = u1.id
LEFT JOIN users u2 ON aal.target_user_id = u2.id
WHERE aal.action LIKE 'SUPER_ADMIN%'
ORDER BY aal.timestamp DESC
LIMIT 100;
```

---

### **5. Rate Limiting**

#### **Limiter Actions Sensibles** :
- **Limite** : 50 requêtes / 15 minutes par utilisateur
- **Cible** : Actions de modification/suppression d'utilisateurs SUPER_ADMIN
- **Clé** : ID utilisateur

```javascript
const superAdminActionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50,
    keyGenerator: (req) => req.user?.id || req.ip,
    skip: async (req) => {
        // Ne s'applique qu'aux actions sur SUPER_ADMIN
        if (req.method === 'GET') return true;
        
        const targetUserId = req.params.id;
        return !(await isSuperAdmin(targetUserId));
    }
});
```

#### **Limiter Tentatives Non Autorisées** :
- **Limite** : 5 tentatives / 1 heure par IP
- **Cible** : Tentatives d'accès non autorisées répétées
- **Clé** : Adresse IP

```javascript
const unauthorizedAccessLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 5,
    keyGenerator: (req) => req.ip
});
```

#### **Message d'erreur** :
```json
{
    "success": false,
    "message": "Trop de requêtes sensibles",
    "reason": "Vous avez effectué trop d'actions sensibles en peu de temps. Veuillez patienter 15 minutes avant de réessayer.",
    "retryAfter": "15 minutes"
}
```

---

### **6. Masquage & Filtrage**

#### **A. Masquage du Rôle SUPER_ADMIN**

Les non-SUPER_ADMIN ne voient pas le rôle `SUPER_ADMIN` dans :
- `/api/permissions/roles`
- `/api/users/roles`

```javascript
const isSuperAdmin = userRoles.includes('SUPER_ADMIN') || req.user.role === 'SUPER_ADMIN';

const whereClause = isSuperAdmin 
    ? '' 
    : "WHERE name != 'SUPER_ADMIN'";
```

#### **B. Masquage des Utilisateurs SUPER_ADMIN**

Les non-SUPER_ADMIN ne voient pas les utilisateurs `SUPER_ADMIN` dans :
- `/api/permissions/users`
- `/api/users`

```javascript
if (!isSuperAdmin) {
    conditions.push(`u.id NOT IN (
        SELECT DISTINCT ur.user_id
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE r.name = 'SUPER_ADMIN'
    )`);
    conditions.push(`u.role != 'SUPER_ADMIN'`);
}
```

#### **C. Masquage des Permissions Sensibles**

Les non-SUPER_ADMIN ne voient pas les permissions :
- `permissions.*` (gestion des permissions)
- `menu.parametres_administration%` (menu PARAMÈTRES ADMINISTRATION)

```javascript
if (!isSuperAdmin) {
    permissionsWhereClause = `
        WHERE p.code NOT LIKE 'permissions.%'
        AND p.code NOT LIKE 'menu.parametres_administration%'
    `;
}
```

---

## 🧪 Tests & Validation

### **Scénarios de Test**

#### **1. Test Protection Modification**

**En tant qu'ADMIN régulier** :
```bash
PUT /api/users/{super_admin_id}
```
**Résultat Attendu** : `403 Forbidden`

**En tant que SUPER_ADMIN** :
```bash
PUT /api/users/{super_admin_id}
```
**Résultat Attendu** : `200 OK`

---

#### **2. Test Protection Dernier SUPER_ADMIN**

**En tant que SUPER_ADMIN (dernier)** :
```bash
DELETE /api/users/{own_id}
```
**Résultat Attendu** : `400 Bad Request`

**En tant que SUPER_ADMIN (plusieurs)** :
```bash
DELETE /api/users/{autre_super_admin_id}
```
**Résultat Attendu** : `200 OK` + enregistrement dans l'audit log

---

#### **3. Test Rate Limiting**

**Effectuer 51 modifications en 15 minutes** :
```bash
for i in {1..51}; do
    curl -X PUT /api/users/{super_admin_id} \
         -H "Authorization: Bearer {token}" \
         -d '{"nom": "Test'$i'"}'
done
```
**Résultat Attendu** : Les 50 premières passent, la 51ème retourne `429 Too Many Requests`

---

#### **4. Test Audit Log**

**Après une action sensible** :
```sql
SELECT * FROM super_admin_audit_log 
WHERE action = 'SUPER_ADMIN_ROLE_GRANTED'
ORDER BY timestamp DESC 
LIMIT 1;
```
**Résultat Attendu** : Enregistrement présent avec tous les détails (user_id, target_user_id, ip_address, user_agent)

---

## 📈 Monitoring & Alertes

### **Requêtes SQL Utiles**

#### **1. Compter les SUPER_ADMIN**
```sql
SELECT COUNT(DISTINCT ur.user_id) as count
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE r.name = 'SUPER_ADMIN';
```

#### **2. Lister les Actions SUPER_ADMIN des Dernières 24h**
```sql
SELECT 
    timestamp,
    action,
    (SELECT nom || ' ' || prenom FROM users WHERE id = user_id) as acteur,
    (SELECT nom || ' ' || prenom FROM users WHERE id = target_user_id) as cible
FROM super_admin_audit_log
WHERE timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

#### **3. Détection de Tentatives Suspectes**
```sql
SELECT 
    user_id,
    COUNT(*) as tentatives,
    ARRAY_AGG(DISTINCT ip_address) as ips
FROM super_admin_audit_log
WHERE action LIKE '%UNAUTHORIZED%'
AND timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) >= 3;
```

---

## 🚀 Déploiement

### **Étapes de Déploiement**

1. **Exécuter la migration**
   ```bash
   node scripts/run-super-admin-migration.js
   ```

2. **Vérifier la table d'audit**
   ```sql
   SELECT COUNT(*) FROM super_admin_audit_log;
   ```

3. **Redémarrer le serveur**
   ```bash
   pm2 restart eb-vision
   ```

4. **Tester les protections**
   - Connexion en tant qu'ADMIN : Vérifier que SUPER_ADMIN est masqué
   - Connexion en tant que SUPER_ADMIN : Vérifier l'accès total

---

## 📝 Maintenance

### **Nettoyage des Logs Anciens**

Exécuter mensuellement :
```sql
DELETE FROM super_admin_audit_log
WHERE timestamp < NOW() - INTERVAL '6 months';
```

### **Sauvegarde des Logs**

Avant nettoyage, exporter les logs :
```bash
pg_dump -t super_admin_audit_log eb_vision_2_0 > audit_logs_$(date +%Y%m%d).sql
```

---

## 🎯 Prochaines Étapes (Non Implémentées)

Les mesures suivantes peuvent être ajoutées ultérieurement :
- Authentification à deux facteurs (2FA) obligatoire
- Réauthentification périodique
- Limitation d'IP
- Limitation d'horaires
- Confirmation supplémentaire pour actions critiques
- Tableau de bord de sécurité dédié

---

**Auteur** : Système EB-Vision 2.0  
**Date de dernière mise à jour** : 2 octobre 2025  
**Version** : 2.0















