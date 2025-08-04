# Guide du Système d'Activités et de Feuilles de Temps

## 📋 Vue d'ensemble

Ce système permet aux collaborateurs de saisir leur temps sur deux types d'activités :
1. **Missions** : Temps passé sur des missions client avec des tâches spécifiques
2. **Activités** : Temps passé sur d'autres activités (congés, formation, administration, etc.)

## 🏗️ Architecture du Système

### Tables Principales

#### 1. **activities** - Gestion des Activités
```sql
- id (UUID) : Identifiant unique
- nom (VARCHAR) : Nom de l'activité
- description (TEXT) : Description détaillée
- business_unit_id (UUID) : Business Unit associée
- type_activite (VARCHAR) : Type (ADMINISTRATIF, FORMATION, CONGE, MALADIE, FERIE, DEPLACEMENT, AUTRE)
- obligatoire (BOOLEAN) : Si l'activité est obligatoire
- actif (BOOLEAN) : Si l'activité est active
```

#### 2. **time_sheets** - Feuilles de Temps Hebdomadaires
```sql
- id (UUID) : Identifiant unique
- collaborateur_id (UUID) : Collaborateur concerné
- semaine (INTEGER) : Numéro de semaine (1-53)
- annee (INTEGER) : Année
- date_debut_semaine (DATE) : Date de début de semaine
- date_fin_semaine (DATE) : Date de fin de semaine
- statut (VARCHAR) : BROUILLON, EN_COURS, SOUMISE, VALIDEE, REJETEE
- total_heures (DECIMAL) : Total des heures de la semaine
- total_heures_chargeables (DECIMAL) : Heures sur missions
- total_heures_non_chargeables (DECIMAL) : Heures sur activités
```

#### 3. **time_entries_detailed** - Saisies Détaillées
```sql
- id (UUID) : Identifiant unique
- time_sheet_id (UUID) : Feuille de temps associée
- date_saisie (DATE) : Date de la saisie
- jour_semaine (VARCHAR) : LUNDI, MARDI, etc.
- type_saisie (VARCHAR) : MISSION ou ACTIVITE
- mission_id (UUID) : Mission (si type_saisie = MISSION)
- task_id (UUID) : Tâche (si applicable)
- activity_id (UUID) : Activité (si type_saisie = ACTIVITE)
- heures_matin (DECIMAL) : Heures du matin
- heures_apres_midi (DECIMAL) : Heures de l'après-midi
- total_heures (DECIMAL) : Calculé automatiquement
- description_matin (TEXT) : Description matin
- description_apres_midi (TEXT) : Description après-midi
```

#### 4. **time_sheet_notifications** - Notifications
```sql
- id (UUID) : Identifiant unique
- collaborateur_id (UUID) : Collaborateur concerné
- time_sheet_id (UUID) : Feuille de temps associée
- type_notification (VARCHAR) : Type de notification
- message (TEXT) : Message de notification
- lu (BOOLEAN) : Si la notification a été lue
```

### Fonctions Utilitaires

#### 1. **get_iso_week(date_input DATE)**
Calcule le numéro de semaine ISO pour une date donnée.

#### 2. **get_week_dates(week_number INTEGER, year_number INTEGER)**
Retourne les dates de début et fin de semaine pour un numéro de semaine et une année.

#### 3. **create_time_sheet_if_not_exists(p_collaborateur_id UUID, p_semaine INTEGER, p_annee INTEGER)**
Crée automatiquement une feuille de temps si elle n'existe pas.

### Triggers Automatiques

#### 1. **update_time_sheet_totals()**
Recalcule automatiquement les totaux de la feuille de temps quand une saisie est ajoutée/modifiée/supprimée.

## 🔄 Workflow de Saisie de Temps

### 1. **Création Automatique de Feuille de Temps**
- Quand un collaborateur accède à la saisie de temps pour une semaine
- Une feuille de temps est automatiquement créée si elle n'existe pas
- Les dates de début et fin de semaine sont calculées automatiquement

### 2. **Saisie Détaillée par Jour**
- Le collaborateur peut saisir son temps jour par jour
- Pour chaque jour, il peut saisir :
  - **Matin** : Heures et description
  - **Après-midi** : Heures et description
- Maximum 12h par jour (6h matin + 6h après-midi)

### 3. **Types de Saisie**
- **MISSION** : Temps passé sur une mission client avec une tâche spécifique
- **ACTIVITE** : Temps passé sur une activité autre qu'une mission

### 4. **Calculs Automatiques**
- **Total heures par jour** = Heures matin + Heures après-midi
- **Total heures par semaine** = Somme de tous les jours
- **Heures chargeables** = Somme des heures sur missions
- **Heures non-chargeables** = Somme des heures sur activités

## 📊 Gestion des Activités

### Types d'Activités Disponibles
1. **ADMINISTRATIF** : Tâches administratives diverses
2. **FORMATION** : Formations internes et externes
3. **CONGE** : Congés payés et congés exceptionnels
4. **MALADIE** : Arrêts maladie et congés de maladie
5. **FERIE** : Jours fériés travaillés
6. **DEPLACEMENT** : Déplacements professionnels
7. **AUTRE** : Autres activités non classées

### Configuration des Activités
- **Obligatoires** : Activités qui doivent être saisies (congés, maladie, fériés)
- **Optionnelles** : Activités facultatives (formation, administration)
- **Par Business Unit** : Chaque activité est associée à une Business Unit

## 🔄 Workflow de Validation

### 1. **Statuts de Feuille de Temps**
- **BROUILLON** : Feuille en cours de saisie
- **EN_COURS** : Feuille en cours de saisie
- **SOUMISE** : Feuille soumise pour validation
- **VALIDEE** : Feuille validée par le manager
- **REJETEE** : Feuille rejetée avec commentaire

### 2. **Processus de Validation**
1. Le collaborateur saisit son temps
2. Il soumet sa feuille de temps
3. Le manager reçoit une notification
4. Le manager valide ou rejette la feuille
5. Le collaborateur reçoit une notification du résultat

## 🔔 Système de Notifications

### Types de Notifications
- **FEUILLE_INCOMPLETE** : Feuille de temps incomplète
- **FEUILLE_NON_SOUMISE** : Feuille non soumise à la fin de semaine
- **FEUILLE_EN_RETARD** : Feuille en retard
- **VALIDATION_REQUISE** : Validation requise par le manager

### Déclencheurs Automatiques
- Notifications envoyées automatiquement selon les règles métier
- Système de relances automatiques
- Historique des notifications

## 🛠️ API Endpoints

### Activités
- `GET /api/activities` - Liste des activités
- `POST /api/activities` - Créer une activité
- `PUT /api/activities/:id` - Modifier une activité
- `DELETE /api/activities/:id` - Supprimer une activité
- `GET /api/activities/statistics` - Statistiques des activités

### Feuilles de Temps
- `GET /api/time-sheets` - Liste des feuilles de temps
- `POST /api/time-sheets` - Créer une feuille de temps
- `GET /api/time-sheets/:id` - Détails d'une feuille de temps
- `PUT /api/time-sheets/:id` - Modifier une feuille de temps
- `POST /api/time-sheets/:id/submit` - Soumettre une feuille
- `POST /api/time-sheets/:id/validate` - Valider une feuille
- `POST /api/time-sheets/:id/reject` - Rejeter une feuille
- `GET /api/time-sheets/overdue` - Feuilles en retard
- `GET /api/time-sheets/statistics` - Statistiques

## 📱 Interface Utilisateur

### Page des Activités (`/activities.html`)
- Liste des activités avec filtres
- Création/modification d'activités
- Gestion des types et business units
- Statistiques des activités

### Page de Saisie de Temps (à créer)
- Interface intuitive pour la saisie
- Sélection mission/activité
- Saisie par jour avec matin/après-midi
- Validation en temps réel
- Soumission et suivi des statuts

## 🎯 Avantages du Système

### Pour les Collaborateurs
- **Interface intuitive** : Saisie simple et rapide
- **Flexibilité** : Choix entre missions et activités
- **Transparence** : Suivi en temps réel des statuts
- **Notifications** : Alertes automatiques

### Pour les Managers
- **Validation centralisée** : Toutes les feuilles au même endroit
- **Contrôles automatiques** : Détection des anomalies
- **Statistiques** : Tableaux de bord détaillés
- **Notifications** : Alertes sur les feuilles en retard

### Pour l'Organisation
- **Traçabilité complète** : Historique de toutes les saisies
- **Conformité** : Respect des règles métier
- **Rentabilité** : Distinction chargeable/non-chargeable
- **Reporting** : Rapports détaillés pour la direction

## 🔧 Configuration et Maintenance

### Ajout d'une Nouvelle Activité
1. Accéder à la page des activités
2. Cliquer sur "Nouvelle Activité"
3. Remplir les informations :
   - Nom de l'activité
   - Description
   - Business Unit
   - Type d'activité
   - Obligatoire ou non
4. Sauvegarder

### Modification d'une Activité
1. Trouver l'activité dans la liste
2. Cliquer sur "Modifier"
3. Modifier les champs nécessaires
4. Sauvegarder

### Gestion des Business Units
- Chaque activité doit être associée à une Business Unit
- Les activités peuvent être partagées entre Business Units
- Configuration des activités obligatoires par Business Unit

## 📈 Évolutions Futures

### Fonctionnalités Prévues
1. **Interface mobile** : Application mobile pour la saisie
2. **Synchronisation** : Intégration avec calendriers
3. **IA** : Suggestions automatiques de saisie
4. **Reporting avancé** : Rapports personnalisés
5. **Intégrations** : Connexion avec d'autres systèmes

### Améliorations Techniques
1. **Performance** : Optimisation des requêtes
2. **Sécurité** : Audit trail complet
3. **Scalabilité** : Support de grandes équipes
4. **API** : Documentation complète de l'API

## 🚀 Démarrage Rapide

### 1. Vérifier l'Installation
```bash
node scripts/test-activities-system.js
```

### 2. Accéder à l'Interface
- Ouvrir `http://localhost:3000/activities.html`
- Se connecter avec un compte utilisateur
- Commencer à créer des activités

### 3. Tester la Saisie
- Créer une feuille de temps pour un collaborateur
- Ajouter des saisies de temps
- Vérifier les calculs automatiques

## 📞 Support

Pour toute question ou problème :
1. Consulter ce guide
2. Vérifier les logs du serveur
3. Tester avec le script de diagnostic
4. Contacter l'équipe de développement

---

**Version** : 1.0  
**Date** : 2025  
**Auteur** : Équipe TRS 