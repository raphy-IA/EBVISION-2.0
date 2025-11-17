# 🔒 Référence Rapide - Sécurité SUPER_ADMIN

## 🎯 Protections Activées

| Protection | Statut | Description |
|------------|--------|-------------|
| 🛡️ **Modification/Suppression** | ✅ | Seuls les SUPER_ADMIN peuvent modifier/supprimer d'autres SUPER_ADMIN |
| 🚫 **Auto-Dégradation** | ✅ | Le dernier SUPER_ADMIN ne peut pas être supprimé/dégradé |
| 📝 **Audit Log** | ✅ | Toutes les actions SUPER_ADMIN sont tracées avec IP et user-agent |
| ⏱️ **Rate Limiting** | ✅ | Max 50 actions sensibles / 15 min par utilisateur |
| 👁️ **Masquage Rôle** | ✅ | Les non-SUPER_ADMIN ne voient pas le rôle SUPER_ADMIN |
| 🙈 **Masquage Utilisateurs** | ✅ | Les non-SUPER_ADMIN ne voient pas les utilisateurs SUPER_ADMIN |
| 🔐 **Permissions Sensibles** | ✅ | Permissions `permissions.*` et `menu.parametres_administration%` masquées |

---

## 📁 Fichiers Créés

```
📂 src/
  ├── 📂 utils/
  │   └── ✨ superAdminHelper.js          (Utilitaires de sécurité)
  ├── 📂 middleware/
  │   └── ✨ superAdminRateLimiter.js     (Rate limiting)
  └── 📂 routes/
      ├── 🔧 users.js                     (Protections ajoutées)
      └── 🔧 permissions.js               (Filtrage ajouté)

📂 migrations/
  └── ✨ 004_create_super_admin_audit_log.sql

📂 scripts/
  ├── ✨ run-super-admin-migration.js
  └── ✨ test-super-admin-security.js

📂 docs/
  ├── ✨ SUPER_ADMIN_SECURITY_IMPLEMENTATION.md
  ├── ✨ SUPER_ADMIN_DEPLOYMENT_GUIDE.md
  ├── ✨ SUPER_ADMIN_QUICK_REFERENCE.md
  └── 📄 SUPER_ADMIN_RESTRICTIONS.md
```

---

## 🧪 Tests Rapides

### Test 1: Filtrage Rôle
```bash
# En tant qu'ADMIN régulier
curl -H "Authorization: Bearer {token}" http://localhost:3000/api/permissions/roles
# ❌ SUPER_ADMIN ne doit PAS apparaître

# En tant que SUPER_ADMIN
curl -H "Authorization: Bearer {token}" http://localhost:3000/api/permissions/roles
# ✅ SUPER_ADMIN DOIT apparaître
```

### Test 2: Protection Modification
```bash
# En tant qu'ADMIN régulier, tenter de modifier un SUPER_ADMIN
curl -X PUT -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     -d '{"nom": "Test"}' \
     http://localhost:3000/api/users/{super_admin_id}

# Résultat attendu: 403 Forbidden
```

### Test 3: Audit Log
```sql
SELECT * FROM super_admin_audit_log 
ORDER BY timestamp DESC 
LIMIT 10;
```

### Test 4: Rate Limiting
```bash
# Effectuer 51 requêtes rapides
for i in {1..51}; do
    curl -X PUT http://localhost:3000/api/users/{id} \
         -H "Authorization: Bearer {token}" \
         -d "{\"nom\": \"Test$i\"}"
done

# Requête 51: 429 Too Many Requests
```

---

## 📊 Actions Tracées

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

---

## 🚀 Commandes Utiles

### Déploiement
```bash
# 1. Exécuter la migration
node scripts/run-super-admin-migration.js

# 2. Tester la sécurité
node scripts/test-super-admin-security.js

# 3. Redémarrer le serveur
pm2 restart eb-vision
```

### Monitoring
```bash
# Compter les SUPER_ADMIN
psql -d eb_vision_2_0 -c "
    SELECT COUNT(DISTINCT ur.user_id)
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE r.name = 'SUPER_ADMIN';
"

# Voir les actions récentes
psql -d eb_vision_2_0 -c "
    SELECT timestamp, action, user_id, target_user_id
    FROM super_admin_audit_log
    ORDER BY timestamp DESC
    LIMIT 10;
"

# Détecter tentatives suspectes
psql -d eb_vision_2_0 -c "
    SELECT user_id, COUNT(*) as tentatives
    FROM super_admin_audit_log
    WHERE action LIKE '%UNAUTHORIZED%'
    AND timestamp >= NOW() - INTERVAL '1 hour'
    GROUP BY user_id
    HAVING COUNT(*) >= 3;
"
```

---

## ⚠️ Messages d'Erreur

### 403 Forbidden
```json
{
    "success": false,
    "message": "Accès refusé",
    "reason": "Seul un SUPER_ADMIN peut modifier un autre SUPER_ADMIN"
}
```

### 400 Bad Request (Dernier SUPER_ADMIN)
```json
{
    "success": false,
    "message": "Opération interdite",
    "reason": "Impossible de retirer le dernier SUPER_ADMIN. Au moins un SUPER_ADMIN doit toujours exister dans le système."
}
```

### 429 Too Many Requests
```json
{
    "success": false,
    "message": "Trop de requêtes sensibles",
    "reason": "Vous avez effectué trop d'actions sensibles en peu de temps. Veuillez patienter 15 minutes avant de réessayer.",
    "retryAfter": "15 minutes"
}
```

---

## 📞 Ressources

- **Documentation complète** : `/docs/SUPER_ADMIN_SECURITY_IMPLEMENTATION.md`
- **Guide de déploiement** : `/docs/SUPER_ADMIN_DEPLOYMENT_GUIDE.md`
- **Tests** : `scripts/test-super-admin-security.js`
- **Migration** : `migrations/004_create_super_admin_audit_log.sql`

---

**Version** : 2.0  
**Dernière mise à jour** : 2 octobre 2025
























