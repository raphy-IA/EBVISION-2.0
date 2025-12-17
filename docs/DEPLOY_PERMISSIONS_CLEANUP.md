# Guide de Déploiement - Nettoyage des Permissions (SIMPLIFIÉ)

## ✅ Bonne Nouvelle !

Votre projet utilise déjà un **système de migrations automatique**. La migration sera exécutée automatiquement au démarrage du serveur !

## 🚀 Procédure de Déploiement en Production

### Étape 1: Backup (CRITIQUE !)

Toujours faire un backup avant de déployer :

```bash
# Sur le serveur de production
pg_dump -U postgres -d ebvision > backup_permissions_$(date +%Y%m%d_%H%M%S).sql
```

### Étape 2: Déployer le Code

```bash
cd /path/to/EB-Vision-2.0
git pull origin main
```

### Étape 3: Redémarrer le Serveur

**C'est tout !** La migration s'exécutera automatiquement au démarrage.

```bash
# Si vous utilisez PM2
pm2 restart ebvision

# OU si vous utilisez systemd
sudo systemctl restart ebvision

# OU si vous utilisez npm directement
npm start
```

## 🔍 Comment ça Fonctionne ?

1. **Au démarrage** : Le serveur lit le dossier `migrations/`
2. **Vérification** : Il vérifie quelles migrations ont déjà été exécutées (table `migrations`)
3. **Exécution** : Il exécute uniquement les nouvelles migrations
4. **Marquage** : Chaque migration exécutée est marquée dans la base

Votre migration `012_cleanup_duplicate_permissions.sql` sera automatiquement détectée et exécutée !

## 📋 Logs à Surveiller

Au démarrage, vous verrez :

```
🔄 Vérification des migrations...
🚀 Démarrage du système de migrations
📋 Migrations déjà exécutées: [...]
📁 Fichiers de migration trouvés: [...]
🔄 Exécution de la migration: 012_cleanup_duplicate_permissions.sql
✅ Migration 012_cleanup_duplicate_permissions.sql terminée avec succès
🎉 Toutes les migrations ont été exécutées avec succès!
```

## ✅ Vérification Post-Déploiement

1. **Vérifier les logs** du serveur pour confirmer l'exécution
2. **Tester l'interface** `permissions-admin.html`
3. **Vérifier** qu'il n'y a plus de doublons

### Commande de Vérification (Optionnelle)

```bash
# Se connecter à la base
psql -U postgres -d ebvision

# Vérifier les doublons
SELECT name, category, COUNT(*) 
FROM permissions 
GROUP BY name, category 
HAVING COUNT(*) > 1;

# Devrait retourner 0 lignes
```

## 🔄 Rollback en Cas de Problème

Si quelque chose ne va pas :

```bash
# Restaurer le backup
psql -U postgres -d ebvision < backup_permissions_YYYYMMDD_HHMMSS.sql

# Redémarrer le serveur
pm2 restart ebvision
```

## 📝 Fichiers Déployés

- ✅ `public/template-modern-sidebar.html` - Permissions menu corrigées
- ✅ `migrations/012_cleanup_duplicate_permissions.sql` - Migration automatique
- ✅ `scripts/debug/*.js` - Scripts d'analyse (optionnels)

## 🎯 Résumé

**Avant** : Commandes psql complexes  
**Maintenant** : `git pull` + `pm2 restart` = C'est fait ! 🎉

La migration s'exécute automatiquement, en toute sécurité, avec transaction SQL.
