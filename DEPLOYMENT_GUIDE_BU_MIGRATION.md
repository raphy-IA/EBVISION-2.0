# Guide de Déploiement en Production - Migration Business Unit

## 📋 Vue d'ensemble

Ce guide explique comment déployer les modifications de Business Unit sur les types de mission en production, incluant la migration des données existantes.

## ⚠️ IMPORTANT - Ordre d'exécution

Les scripts doivent être exécutés dans cet ordre précis :
1. Migration SQL (automatique via deploy.sh)
2. Script d'analyse (optionnel, pour vérification)
3. Script de migration des types de mission
4. Script de copie des tâches

## 🔧 Étape 1 : Préparation Locale

### Vérifier les scripts de migration

Les scripts suivants doivent être présents dans `scripts/migrations/` :

```bash
ls -la scripts/migrations/
```

Fichiers requis :
- ✅ `analyze_mission_types_bu.js` - Analyse avant migration
- ✅ `migrate_mission_types_bu.js` - Migration principale
- ✅ `copy_tasks_to_duplicated_types.js` - Copie des tâches

### Vérifier les migrations SQL

Assurez-vous que la migration SQL existe :
```bash
cat migrations/XXX_add_business_unit_to_mission_types.sql
```

## 🚀 Étape 2 : Déploiement Git

### Sur votre machine locale

```bash
# 1. Vérifier le statut
git status

# 2. Ajouter tous les fichiers modifiés
git add .

# 3. Commit avec message descriptif
git commit -m "feat: Add Business Unit to Mission Types with data migration

- Add business_unit_id column to mission_types (mandatory)
- Duplicate shared mission types per BU
- Update frontend to display and filter by BU
- Add personnel assignment improvements
- Include migration scripts for production"

# 4. Pousser vers le dépôt
git push origin main  # ou votre branche
```

## 🖥️ Étape 3 : Sur le Serveur de Production

### A. Connexion SSH

```bash
ssh user@votre-serveur-production
cd /path/to/ebvision
```

### B. Pull des modifications

```bash
# 1. Backup de sécurité
sudo -u postgres pg_dump ebvision > backup_before_bu_migration_$(date +%Y%m%d_%H%M%S).sql

# 2. Pull du code
git pull origin main

# 3. Installer les dépendances (si nouvelles)
npm install
```

### C. Exécution du script de déploiement

```bash
# Le script deploy.sh va automatiquement :
# - Faire un backup de la DB
# - Exécuter git pull
# - Installer les dépendances
# - Exécuter les migrations SQL
# - Redémarrer l'application

sudo ./deploy.sh
```

> **Note :** La migration SQL va ajouter la colonne `business_unit_id` mais elle sera NULL pour les types existants.

### D. Exécution des scripts de migration de données

#### 1. Analyse préalable (optionnel mais recommandé)

```bash
# Analyser la situation actuelle
node scripts/migrations/analyze_mission_types_bu.js
```

Ce script va créer un fichier `analysis_report.json` avec :
- Types de mission partagés entre plusieurs BU
- Types de mission sans BU
- Missions affectées à chaque type

#### 2. Migration des types de mission

```bash
# Exécuter la migration principale
node scripts/migrations/migrate_mission_types_bu.js
```

**Ce script va :**
- ✅ Ajouter la colonne `business_unit_id` (si pas déjà fait)
- ✅ Assigner les BU aux types existants via leurs divisions
- ✅ Dupliquer les types partagés (ex: "PE - PREVIOUS ENGAGEMENT")
- ✅ Mettre à jour les missions existantes pour pointer vers les nouveaux types
- ✅ Rendre `business_unit_id` obligatoire (NOT NULL)

**Exemple de sortie attendue :**
```
🔍 Analyse des types de mission...
📊 Types partagés trouvés: 2
   - PE - PREVIOUS ENGAGEMENT (3 BU)
   - AUDIT - AUDIT FINANCIER (2 BU)

🔄 Duplication des types partagés...
✅ PE - PREVIOUS ENGAGEMENT dupliqué pour AUDIT
✅ PE - PREVIOUS ENGAGEMENT dupliqué pour CONSEIL
✅ AUDIT - AUDIT FINANCIER dupliqué pour FISCAL

📝 Mise à jour des missions...
✅ 45 missions mises à jour

✅ Migration terminée avec succès!
```

#### 3. Copie des tâches vers les types dupliqués

```bash
# Copier les tâches associées
node scripts/migrations/copy_tasks_to_duplicated_types.js
```

**Ce script va :**
- ✅ Identifier les types dupliqués (suffixe " - BU_NAME")
- ✅ Copier toutes les tâches du type original vers les duplicatas
- ✅ Préserver le statut `obligatoire` de chaque tâche

**Exemple de sortie :**
```
🔍 Recherche des types dupliqués...
📋 Types dupliqués trouvés: 5

🔄 Copie des tâches...
✅ PE - PREVIOUS ENGAGEMENT - AUDIT: 3 tâches copiées
✅ PE - PREVIOUS ENGAGEMENT - CONSEIL: 3 tâches copiées

✅ Copie terminée avec succès!
```

## ✅ Étape 4 : Vérification

### Vérifier la structure de la base de données

```bash
sudo -u postgres psql ebvision -c "\d mission_types"
```

Vous devriez voir :
```
business_unit_id | uuid | not null
```

### Vérifier les données

```bash
# Compter les types par BU
sudo -u postgres psql ebvision -c "
SELECT bu.nom, COUNT(mt.id) as nb_types
FROM mission_types mt
JOIN business_units bu ON mt.business_unit_id = bu.id
GROUP BY bu.nom
ORDER BY bu.nom;
"

# Vérifier qu'il n'y a plus de NULL
sudo -u postgres psql ebvision -c "
SELECT COUNT(*) as types_sans_bu
FROM mission_types
WHERE business_unit_id IS NULL;
"
```

Le résultat devrait être `0` pour les types sans BU.

### Tester l'application

1. **Page Mission Types** : `https://votre-domaine/mission-types.html`
   - ✅ Colonne "Business Unit" visible
   - ✅ Filtre BU fonctionne
   - ✅ Tous les types ont une BU

2. **Création de Mission** : `https://votre-domaine/create-mission-step2.html`
   - ✅ Types filtrés par BU de l'opportunité
   - ✅ Affectation du personnel fonctionne

## 🔄 Rollback (en cas de problème)

Si quelque chose ne va pas :

```bash
# Restaurer le backup
sudo -u postgres psql ebvision < backup_before_bu_migration_YYYYMMDD_HHMMSS.sql

# Revenir au commit précédent
git reset --hard HEAD~1

# Redémarrer l'application
pm2 restart ebvision
```

## 📊 Résumé des Commandes Production

```bash
# 1. Connexion et préparation
ssh user@production
cd /path/to/ebvision
sudo -u postgres pg_dump ebvision > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Déploiement
git pull origin main
npm install
sudo ./deploy.sh

# 3. Migration des données (DANS CET ORDRE)
node scripts/migrations/analyze_mission_types_bu.js  # Optionnel
node scripts/migrations/migrate_mission_types_bu.js  # OBLIGATOIRE
node scripts/migrations/copy_tasks_to_duplicated_types.js  # OBLIGATOIRE

# 4. Vérification
sudo -u postgres psql ebvision -c "\d mission_types"
sudo -u postgres psql ebvision -c "SELECT COUNT(*) FROM mission_types WHERE business_unit_id IS NULL;"
```

## ⏱️ Temps estimé

- Backup : 1-2 minutes
- Git pull + npm install : 2-3 minutes
- Deploy.sh (migrations SQL) : 1-2 minutes
- Migration des données : 2-5 minutes
- Copie des tâches : 1-2 minutes
- Vérification : 2-3 minutes

**Total : ~15 minutes**

## 📞 Support

En cas de problème :
1. Vérifier les logs : `pm2 logs ebvision`
2. Vérifier les erreurs SQL dans les scripts
3. Consulter le fichier `analysis_report.json` pour comprendre l'état avant migration

## ✨ Après la migration

Une fois la migration réussie :
- ✅ Tous les types de mission ont une Business Unit
- ✅ Les types partagés sont dupliqués par BU
- ✅ Les missions existantes pointent vers les bons types
- ✅ Les tâches sont copiées sur tous les types dupliqués
- ✅ L'interface affiche et filtre par BU
