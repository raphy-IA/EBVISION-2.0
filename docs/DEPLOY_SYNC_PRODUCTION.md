# 🚀 Déploiement de la Synchronisation des Permissions en Production

## 📋 Prérequis

✅ Git pull effectué
✅ npm install effectué
✅ Accès à la base de données PostgreSQL en production

## 🔧 Étapes de déploiement

### Étape 1 : Exécuter la migration SQL

```bash
cd ~/apps/ebvision

# Option A : Via Node.js (recommandé)
node scripts/run-sync-migration.js

# Option B : Via psql directement
psql -h localhost -U ebvision_user -d ebvision_db -f migrations/005_create_sync_tables.sql
```

**Ce que fait cette migration :**
- ✅ Crée la table `pages` (stocke les pages HTML)
- ✅ Crée la table `menu_sections` (sections du menu)
- ✅ Crée la table `menu_items` (items de menu)
- ✅ Ajoute la colonne `category` à la table `permissions`
- ✅ Crée les indexes et triggers nécessaires

### Étape 2 : Nettoyer les anciennes permissions (optionnel mais recommandé)

```bash
node scripts/clean-old-menu-permissions.js
```

**Ce script supprime les permissions obsolètes :**
- `menu.business_units.*` → remplacé par `menu.business_unit.*`
- `menu.collaborateurs.*` → remplacé par `menu.gestion_rh.*`
- `menu.missions.*` → remplacé par `menu.gestion_mission.*`
- `menu.opportunities.*` → remplacé par `menu.market_pipeline.*`
- Et autres...

### Étape 3 : Vérifier la structure (optionnel)

```bash
node scripts/check-menu-structure.js
```

Cela affiche un rapport détaillé de la structure actuelle.

### Étape 4 : Redémarrer le serveur

```bash
# Si vous utilisez PM2
pm2 restart ebvision

# Si vous utilisez systemd
sudo systemctl restart ebvision

# Vérifier les logs
pm2 logs ebvision --lines 50
```

### Étape 5 : Synchroniser via l'interface web

1. 🌐 Ouvrez votre navigateur
2. 🔐 Connectez-vous avec un compte **SUPER_ADMIN**
3. 📋 Allez sur `/permissions-admin.html`
4. 🔄 Cliquez sur le bouton jaune **"Synchroniser Permissions & Menus"** (en haut à droite)
5. ⏳ Attendez 3 secondes pour le rechargement automatique
6. ✅ Vérifiez l'onglet "Permissions de Menu"

## 🔍 Vérifications post-déploiement

### Vérifier les tables

```bash
psql -h localhost -U ebvision_user -d ebvision_db -c "SELECT COUNT(*) as pages FROM pages;"
psql -h localhost -U ebvision_user -d ebvision_db -c "SELECT COUNT(*) as sections FROM menu_sections;"
psql -h localhost -U ebvision_user -d ebvision_db -c "SELECT COUNT(*) as items FROM menu_items;"
psql -h localhost -U ebvision_user -d ebvision_db -c "SELECT COUNT(*) as menu_perms FROM permissions WHERE code LIKE 'menu.%';"
```

**Résultats attendus après synchronisation :**
- Pages : ~80-100 (dépend du nombre de fichiers HTML)
- Sections : 9
- Items : 41
- Permissions menu : 41

### Vérifier les logs du serveur

```bash
pm2 logs ebvision --lines 100 | grep -i "sync\|permission\|menu"
```

Recherchez :
- ✅ `🔄 Début de la synchronisation`
- ✅ `🧹 Nettoyage des anciennes permissions`
- ✅ `✅ Synchronisation terminée avec succès`

## 🐛 Dépannage

### Erreur : "Table already exists"

C'est normal ! La migration utilise `CREATE TABLE IF NOT EXISTS`. Aucune action requise.

### Erreur : "Permission denied"

Vérifiez les droits de l'utilisateur PostgreSQL :

```sql
GRANT CREATE ON SCHEMA public TO ebvision_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ebvision_user;
```

### Le bouton "Synchroniser" n'apparaît pas

**Causes possibles :**
1. Vous n'êtes pas connecté avec un compte SUPER_ADMIN
2. Cache du navigateur (`Ctrl+F5` pour vider le cache)
3. Le serveur n'a pas été redémarré

**Solution :**
```bash
# Vérifier votre rôle
psql -h localhost -U ebvision_user -d ebvision_db -c "SELECT u.nom, u.prenom, r.name FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id WHERE u.email = 'admin@trs.com';"

# Redémarrer
pm2 restart ebvision

# Vider le cache navigateur
# Chrome/Edge: Ctrl+Shift+Delete
# Puis recharger avec Ctrl+F5
```

### Erreur 500 lors de la synchronisation

```bash
# Vérifier les logs en temps réel
pm2 logs ebvision --lines 0

# Dans un autre terminal, déclenchez la synchronisation
# Observez les logs pour l'erreur exacte
```

### Les anciennes permissions apparaissent toujours

```bash
# Re-exécuter le nettoyage
node scripts/clean-old-menu-permissions.js

# Puis re-synchroniser via l'interface web
```

## 📊 Script tout-en-un (recommandé)

Pour simplifier, utilisez ce script qui fait tout automatiquement :

```bash
cd ~/apps/ebvision
chmod +x scripts/deploy-sync-migration-production.sh
./scripts/deploy-sync-migration-production.sh
```

Puis :
1. Redémarrer le serveur : `pm2 restart ebvision`
2. Aller sur `/permissions-admin.html`
3. Cliquer sur "Synchroniser Permissions & Menus"

## ✅ Checklist finale

- [ ] Migration SQL exécutée
- [ ] Anciennes permissions nettoyées
- [ ] Serveur redémarré
- [ ] Synchronisation via l'interface effectuée
- [ ] Vérification de l'onglet "Permissions de Menu"
- [ ] Toutes les 9 sections affichées
- [ ] 41 permissions de menu visibles
- [ ] Tests avec différents rôles (non-SUPER_ADMIN)

## 🎯 Rollback (en cas de problème majeur)

```sql
-- Sauvegarder d'abord !
pg_dump -h localhost -U ebvision_user ebvision_db > backup_before_rollback.sql

-- Supprimer les nouvelles tables
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS menu_sections CASCADE;
DROP TABLE IF EXISTS pages CASCADE;

-- Supprimer la colonne category
ALTER TABLE permissions DROP COLUMN IF EXISTS category;

-- Restaurer les anciennes permissions si nécessaire
-- (utilisez le backup précédent)
```

⚠️ **Attention :** Faire un rollback supprimera la possibilité d'utiliser la synchronisation automatique.

## 📞 Support

En cas de problème persistant :
1. Sauvegarder les logs : `pm2 logs ebvision --lines 500 > logs_error.txt`
2. Exporter la structure actuelle : `node scripts/check-menu-structure.js > structure_current.txt`
3. Contacter le support avec ces fichiers

---

**Date de création :** 2 octobre 2025  
**Version :** 1.0  
**Auteur :** Système EB-Vision 2.0



