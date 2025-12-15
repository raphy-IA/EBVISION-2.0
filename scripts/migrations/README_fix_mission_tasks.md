# Guide d'exécution du script de correction des mission_tasks

## Contexte

Après la migration des types de mission avec duplication par Business Unit, certaines missions peuvent avoir des `mission_tasks` qui ne correspondent plus aux tâches de leur type de mission actuel.

## Utilisation

### 1. Mode Analyse (recommandé en premier)

Exécutez d'abord le script en mode analyse pour voir quelles missions seront corrigées :

```bash
node scripts/migrations/fix_mission_tasks_after_bu_migration.js --analyse
```

Ce mode affichera :
- Le nombre de missions avec des problèmes
- Les détails de chaque mission (nom, code, type)
- Le nombre de tâches actuelles vs attendues
- **Aucune modification ne sera effectuée**

### 2. Mode Correction

Une fois que vous avez vérifié l'analyse, exécutez le script sans paramètre pour effectuer les corrections :

```bash
node scripts/migrations/fix_mission_tasks_after_bu_migration.js
```

Ce mode va :
1. Analyser les missions problématiques
2. Pour chaque mission :
   - Supprimer les anciennes `mission_tasks`
   - Recréer les `mission_tasks` basées sur le type de mission actuel
3. Afficher le nombre de missions corrigées

## Déploiement en Production

```bash
# 1. Sur votre machine locale
git add scripts/migrations/fix_mission_tasks_after_bu_migration.js
git commit -m "fix: Add script to fix mission_tasks after BU migration"
git push

# 2. Sur le serveur de production
ssh user@production
cd /path/to/ebvision
git pull

# 3. Analyse d'abord
node scripts/migrations/fix_mission_tasks_after_bu_migration.js --analyse

# 4. Si tout semble correct, exécutez la correction
node scripts/migrations/fix_mission_tasks_after_bu_migration.js
```

## Sécurité

- Le script utilise des transactions (BEGIN/COMMIT/ROLLBACK)
- En cas d'erreur, toutes les modifications sont annulées
- Le mode analyse ne fait aucune modification
- Un backup de la base de données devrait avoir été créé par deploy.sh

## Que fait le script ?

Pour chaque mission dont le nombre de `mission_tasks` ne correspond pas au nombre de tâches de son type :

1. **Suppression** : Supprime toutes les `mission_tasks` existantes de la mission
2. **Récupération** : Récupère les tâches du type de mission actuel via `task_mission_types`
3. **Création** : Crée de nouvelles `mission_tasks` avec le statut 'PLANIFIEE'

## Exemple de sortie

### Mode Analyse
```
🔍 Mode ANALYSE SEULEMENT

📊 Étape 1: Analyse de la situation...

   Missions avec problème de tâches: 3

   📋 Détails des missions à corriger:

   1. Mission Audit Fiscal (MIS-20251215-001)
      Type: AF - Assistance Fiscale
      Mission tasks actuelles: 0
      Type tasks attendues: 4

   2. Mission Conseil RH (MIS-20251215-002)
      Type: PE-RH - PREVIOUS ENGAGEMENT (EB-RH)
      Mission tasks actuelles: 0
      Type tasks attendues: 1

   ──────────────────────────────────────────────────────────
   Total: 3 mission(s) à corriger

ℹ️  Mode analyse seulement - Aucune modification effectuée
```

### Mode Correction
```
📝 Étape 2: Correction des mission_tasks...

   🔸 Mission Audit Fiscal (MIS-20251215-001)
      ✓ Tâche "AUDITPRI931" ajoutée (obligatoire)
      ✓ Tâche "ELABORAT580" ajoutée
      ✓ Tâche "ELABORAT753" ajoutée
      ✓ Tâche "FISCALIT979" ajoutée

============================================================

✅ Correction terminée!
   Missions corrigées: 3
```
