# 🚀 Guide de Déploiement - Sécurité SUPER_ADMIN

**Version** : 2.0  
**Date** : 2 octobre 2025

---

## 📋 Prérequis

- [x] PostgreSQL 12+
- [x] Node.js 18+
- [x] `express-rate-limit` v7.5.1 (déjà installé)
- [x] Accès SSH au serveur de production
- [x] Sauvegarde de la base de données

---

## 🔄 Étapes de Déploiement

### **1. Sauvegarde de la Base de Données**

```bash
# Sur le serveur de production
pg_dump -U postgres -d eb_vision_2_0 > backup_before_super_admin_security_$(date +%Y%m%d).sql
```

### **2. Upload des Fichiers**

Copier les fichiers suivants vers le serveur de production :

```bash
# Depuis votre machine locale
scp src/utils/superAdminHelper.js user@server:/path/to/app/src/utils/
scp src/middleware/superAdminRateLimiter.js user@server:/path/to/app/src/middleware/
scp src/routes/users.js user@server:/path/to/app/src/routes/
scp src/routes/permissions.js user@server:/path/to/app/src/routes/
scp src/models/User.js user@server:/path/to/app/src/models/
scp migrations/004_create_super_admin_audit_log.sql user@server:/path/to/app/migrations/
scp scripts/run-super-admin-migration.js user@server:/path/to/app/scripts/
scp scripts/test-super-admin-security.js user@server:/path/to/app/scripts/
```

**Ou via Git** :
```bash
# Sur le serveur de production
cd /path/to/app
git pull origin main
```

### **3. Exécuter la Migration**

```bash
# Sur le serveur de production
cd /path/to/app
node scripts/run-super-admin-migration.js
```

**Sortie attendue** :
```
🚀 Début de la migration super_admin_audit_log...
📄 Fichier de migration chargé
✅ Table super_admin_audit_log créée avec succès
✅ Vérification: Table super_admin_audit_log existe
🔍 5 index créés
✅ Migration terminée avec succès!
```

### **4. Vérifier l'Installation**

```bash
node scripts/test-super-admin-security.js
```

**Sortie attendue** :
```
🧪 TESTS DE SÉCURITÉ SUPER_ADMIN
📊 TEST 1: Comptage des SUPER_ADMIN
   ✅ Test PASSÉ
🔍 TEST 2: Vérification du statut SUPER_ADMIN
   ✅ Test PASSÉ
...
🎯 RÉSUMÉ DES TESTS
   ✅ Tous les tests de base sont passés
```

### **5. Redémarrer le Serveur**

```bash
# Avec PM2
pm2 restart eb-vision

# Ou avec systemctl
sudo systemctl restart eb-vision

# Vérifier les logs
pm2 logs eb-vision --lines 50
```

### **6. Tests Post-Déploiement**

#### **A. Test Filtrage SUPER_ADMIN**

1. **Connexion en tant qu'ADMIN régulier**
   - Aller sur `/permissions-admin.html`
   - Vérifier que le rôle `SUPER_ADMIN` n'apparaît **PAS** dans l'onglet "Rôles et Permissions"
   - Vérifier qu'aucun utilisateur `SUPER_ADMIN` n'apparaît dans l'onglet "Utilisateurs"

2. **Connexion en tant que SUPER_ADMIN**
   - Aller sur `/permissions-admin.html`
   - Vérifier que le rôle `SUPER_ADMIN` **APPARAÎT** dans l'onglet "Rôles et Permissions"
   - Vérifier que tous les utilisateurs `SUPER_ADMIN` sont visibles

#### **B. Test Protection Modification**

1. **Connexion en tant qu'ADMIN régulier**
   - Tenter de modifier un utilisateur SUPER_ADMIN via `/users.html`
   - **Résultat attendu** : Erreur `403 Forbidden`

2. **Connexion en tant que SUPER_ADMIN**
   - Modifier un autre utilisateur SUPER_ADMIN via `/users.html`
   - **Résultat attendu** : Modification réussie + enregistrement dans l'audit log

#### **C. Test Protection Dernier SUPER_ADMIN**

1. **Identifier le nombre de SUPER_ADMIN**
   ```sql
   SELECT COUNT(DISTINCT ur.user_id) as count
   FROM user_roles ur
   JOIN roles r ON ur.role_id = r.id
   WHERE r.name = 'SUPER_ADMIN';
   ```

2. **Si un seul SUPER_ADMIN existe**
   - Tenter de supprimer ce compte via `/users.html`
   - **Résultat attendu** : Erreur `400 Bad Request` avec message explicite

3. **Si plusieurs SUPER_ADMIN existent**
   - Supprimer l'un d'eux via `/users.html`
   - **Résultat attendu** : Suppression réussie + enregistrement dans l'audit log

#### **D. Test Audit Log**

```sql
-- Vérifier les enregistrements d'audit
SELECT 
    timestamp,
    action,
    (SELECT nom || ' ' || prenom FROM users WHERE id = user_id) as acteur,
    (SELECT nom || ' ' || prenom FROM users WHERE id = target_user_id) as cible,
    details,
    ip_address
FROM super_admin_audit_log
ORDER BY timestamp DESC
LIMIT 10;
```

#### **E. Test Rate Limiting**

**Méthode manuelle** :
1. Effectuer 51 requêtes de modification rapides
2. La 51ème doit retourner `429 Too Many Requests`

**Méthode automatisée** :
```bash
# Depuis votre machine locale
for i in {1..51}; do
    curl -X PUT http://your-server.com/api/users/{super_admin_id} \
         -H "Authorization: Bearer YOUR_TOKEN" \
         -H "Content-Type: application/json" \
         -d "{\"nom\": \"Test$i\"}"
done
```

---

## 📊 Monitoring Post-Déploiement

### **1. Surveiller les Logs d'Audit**

Créer un script de surveillance :

```bash
# /path/to/app/scripts/monitor-super-admin-audit.sh
#!/bin/bash

psql -U postgres -d eb_vision_2_0 -c "
    SELECT 
        COUNT(*) as total_actions,
        COUNT(CASE WHEN action LIKE '%UNAUTHORIZED%' THEN 1 END) as unauthorized_attempts,
        COUNT(CASE WHEN action LIKE '%GRANTED%' THEN 1 END) as role_grants,
        COUNT(CASE WHEN action LIKE '%REVOKED%' THEN 1 END) as role_revokes
    FROM super_admin_audit_log
    WHERE timestamp >= NOW() - INTERVAL '24 hours';
"
```

Exécuter quotidiennement via cron :
```bash
crontab -e
# Ajouter :
0 9 * * * /path/to/app/scripts/monitor-super-admin-audit.sh | mail -s "Daily SUPER_ADMIN Audit Report" admin@company.com
```

### **2. Alertes en Temps Réel**

Configurer des alertes pour :
- Tentatives d'accès non autorisées (>3 en 1h)
- Attribution du rôle SUPER_ADMIN
- Révocation du rôle SUPER_ADMIN
- Tentatives de suppression du dernier SUPER_ADMIN

```sql
-- Exemple de requête pour détecter des tentatives suspectes
SELECT 
    user_id,
    COUNT(*) as tentatives,
    ARRAY_AGG(DISTINCT ip_address) as ips,
    MAX(timestamp) as derniere_tentative
FROM super_admin_audit_log
WHERE action LIKE '%UNAUTHORIZED%'
AND timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) >= 3;
```

### **3. Tableaux de Bord**

Créer des vues SQL pour faciliter le monitoring :

```sql
-- Vue: Actions SUPER_ADMIN récentes
CREATE OR REPLACE VIEW v_super_admin_recent_actions AS
SELECT 
    aal.timestamp,
    aal.action,
    u1.nom || ' ' || u1.prenom as acteur,
    u2.nom || ' ' || u2.prenom as cible,
    aal.details,
    aal.ip_address
FROM super_admin_audit_log aal
JOIN users u1 ON aal.user_id = u1.id
LEFT JOIN users u2 ON aal.target_user_id = u2.id
WHERE aal.timestamp >= NOW() - INTERVAL '7 days'
ORDER BY aal.timestamp DESC;

-- Vue: Statistiques journalières
CREATE OR REPLACE VIEW v_super_admin_daily_stats AS
SELECT 
    DATE(timestamp) as date,
    COUNT(*) as total_actions,
    COUNT(DISTINCT user_id) as utilisateurs_actifs,
    COUNT(CASE WHEN action LIKE '%UNAUTHORIZED%' THEN 1 END) as tentatives_non_autorisees
FROM super_admin_audit_log
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

---

## 🔧 Maintenance

### **Nettoyage Mensuel des Logs**

```bash
# /path/to/app/scripts/cleanup-audit-logs.sh
#!/bin/bash

# Sauvegarder les logs avant suppression
BACKUP_FILE="/backups/audit_logs_$(date +%Y%m%d).sql"
pg_dump -U postgres -d eb_vision_2_0 -t super_admin_audit_log > "$BACKUP_FILE"

# Supprimer les logs de plus de 6 mois
psql -U postgres -d eb_vision_2_0 -c "
    DELETE FROM super_admin_audit_log
    WHERE timestamp < NOW() - INTERVAL '6 months';
"

echo "Logs sauvegardés dans $BACKUP_FILE"
echo "Logs de plus de 6 mois supprimés"
```

Exécuter mensuellement via cron :
```bash
crontab -e
# Ajouter :
0 2 1 * * /path/to/app/scripts/cleanup-audit-logs.sh
```

---

## 🚨 Plan de Rollback

### **En Cas de Problème**

#### **1. Rollback de la Base de Données**

```bash
# Restaurer la sauvegarde
psql -U postgres -d eb_vision_2_0 < backup_before_super_admin_security_YYYYMMDD.sql

# Supprimer la table d'audit
psql -U postgres -d eb_vision_2_0 -c "DROP TABLE IF EXISTS super_admin_audit_log CASCADE;"
```

#### **2. Rollback du Code**

```bash
# Revenir à la version précédente
git revert HEAD
git push origin main

# Ou checkout d'un commit spécifique
git checkout <commit_hash_avant_changements>

# Redémarrer le serveur
pm2 restart eb-vision
```

#### **3. Vérification Post-Rollback**

```bash
# Vérifier que l'application fonctionne
curl -I http://your-server.com/

# Vérifier les logs
pm2 logs eb-vision --lines 50
```

---

## 📞 Support & Contact

En cas de problème :
- **Email** : admin@trs.com
- **Documentation** : `/docs/SUPER_ADMIN_SECURITY_IMPLEMENTATION.md`
- **Tests** : `node scripts/test-super-admin-security.js`

---

**Auteur** : Système EB-Vision 2.0  
**Date** : 2 octobre 2025  
**Version** : 2.0





