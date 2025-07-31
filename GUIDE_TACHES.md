# 📋 GUIDE D'UTILISATION - MODULE TÂCHES

## 🎯 **VUE D'ENSEMBLE**

Le module **Tâches** permet de définir et organiser les tâches par type de mission. Il offre une gestion complète des tâches avec associations aux types de mission, planification et suivi.

### **🏗️ Architecture Technique**

#### **Base de Données**
- **`tasks`** : Définition des tâches (code, libellé, description, durée, priorité)
- **`task_mission_types`** : Association tâches ↔ types de mission (ordre, obligatoire)
- **`mission_tasks`** : Tâches d'une mission spécifique (statut, dates, durée)
- **`task_assignments`** : Assignations personnel (collaborateur, heures, taux)

#### **Backend**
- **Modèle `Task.js`** : CRUD complet avec associations
- **Routes API** : `/api/tasks` avec 8 endpoints
- **Fonctionnalités** : Recherche, statistiques, associations

#### **Frontend**
- **Page `task-templates.html`** : Interface complète
- **Fonctionnalités** : CRUD, filtres, statistiques, modals
- **Intégration** : Sidebar avec lien "Tâches"

## 🚀 **ACCÈS ET NAVIGATION**

### **Accès à la page**
1. Ouvrir l'application TRS
2. Dans la sidebar, section **CONFIGURATION**
3. Cliquer sur **"Tâches"** (icône 📋)

### **Interface principale**
- **En-tête** : Titre + bouton "Nouvelle Tâche"
- **Statistiques** : 4 cartes avec métriques
- **Filtres** : Recherche + filtres par priorité/type
- **Tableau** : Liste des tâches avec actions

## 📊 **FONCTIONNALITÉS PRINCIPALES**

### **1. Visualisation des Tâches**

#### **Tableau principal**
- **Code** : Identifiant unique de la tâche
- **Libellé** : Nom descriptif de la tâche
- **Description** : Détails de la tâche
- **Durée** : Temps estimé en heures
- **Priorité** : Badge coloré (Basse, Moyenne, Haute, Critique)
- **Types Mission** : Nombre de types associés
- **Actions** : Voir, Modifier, Supprimer

#### **Statistiques en temps réel**
- **Total Tâches** : Nombre total de tâches
- **Tâches Actives** : Tâches en statut actif
- **Durée Moyenne** : Temps moyen par tâche
- **Types Associés** : Moyenne des associations

### **2. Filtres et Recherche**

#### **Recherche textuelle**
- Recherche dans : Code, Libellé, Description
- Recherche en temps réel
- Sensible à la casse

#### **Filtres par critères**
- **Priorité** : Basse, Moyenne, Haute, Critique
- **Type de mission** : Filtre par type associé
- **Bouton Reset** : Remise à zéro des filtres

### **3. Création d'une Tâche**

#### **Modal de création**
1. Cliquer sur **"Nouvelle Tâche"**
2. Remplir le formulaire :
   - **Code** * (obligatoire) : Identifiant unique
   - **Libellé** * (obligatoire) : Nom de la tâche
   - **Description** : Détails optionnels
   - **Durée estimée** : Temps en heures
   - **Priorité** : Niveau d'importance
   - **Types de mission** : Sélection multiple

#### **Validation**
- Code unique obligatoire
- Libellé obligatoire
- Durée par défaut : 0h
- Priorité par défaut : Moyenne

### **4. Modification d'une Tâche**

#### **Modal d'édition**
1. Cliquer sur **"Modifier"** (icône ✏️)
2. Modifier les champs :
   - Tous les champs modifiables
   - **Statut** : Actif/Inactif (switch)
3. Cliquer sur **"Mettre à jour"**

#### **Fonctionnalités**
- Pré-remplissage des données
- Validation des modifications
- Soft delete (désactivation)

### **5. Visualisation Détaillée**

#### **Modal de détails**
1. Cliquer sur **"Voir"** (icône 👁️)
2. Informations affichées :
   - **Données de base** : Code, libellé, priorité, durée
   - **Statut** : Actif/Inactif
   - **Types de mission** : Liste des associations
   - **Date de création** : Format français
   - **Description** : Texte complet

### **6. Suppression d'une Tâche**

#### **Processus de suppression**
1. Cliquer sur **"Supprimer"** (icône 🗑️)
2. **Confirmation** : Popup de confirmation
3. **Soft delete** : Désactivation (pas de suppression physique)
4. **Mise à jour** : Tableau et statistiques

## 🔗 **ASSOCIATIONS AVEC LES TYPES DE MISSION**

### **Principe**
- **Une tâche** peut être associée à **plusieurs types de mission**
- **Un type de mission** peut avoir **plusieurs tâches**
- **Relation many-to-many** via table `task_mission_types`

### **Caractéristiques des associations**
- **Ordre** : Position d'affichage dans la liste
- **Obligatoire** : Tâche obligatoire pour ce type de mission
- **Optionnel** : Tâche suggérée mais non obligatoire

### **Exemples d'associations**
```
AUDIT_COMPTES → AU003 (Obligatoire, ordre: 1)
VERIF_FISCALE → AU003 (Obligatoire, ordre: 2)
RAPPORT_FINAL → AU003 (Obligatoire, ordre: 3)
ANALYSE_RISQUES → AU003 (Optionnel, ordre: 4)
```

## 📈 **STATISTIQUES ET MÉTRIQUES**

### **Métriques principales**
- **Total des tâches** : Nombre global
- **Tâches actives** : En statut actif
- **Durée moyenne** : Temps moyen par tâche
- **Répartition par priorité** : Critique, Haute, Moyenne, Basse

### **Analyses par type de mission**
- **Nombre de tâches** par type
- **Tâches obligatoires** vs optionnelles
- **Durée totale** par type de mission

## 🎨 **INTERFACE UTILISATEUR**

### **Design moderne**
- **Couleurs** : Palette cohérente avec l'application
- **Badges** : Priorités avec couleurs distinctives
- **Cartes** : Statistiques avec gradients
- **Modals** : Formulaires avec validation

### **Responsive design**
- **Desktop** : Interface complète
- **Tablet** : Adaptation des colonnes
- **Mobile** : Sidebar repliable

### **Accessibilité**
- **Icônes** : Font Awesome pour la clarté
- **Couleurs** : Contrastes suffisants
- **Navigation** : Clavier et souris

## 🔧 **API ENDPOINTS**

### **Endpoints principaux**
```
GET    /api/tasks                    # Liste des tâches
GET    /api/tasks/:id               # Détails d'une tâche
POST   /api/tasks                   # Créer une tâche
PUT    /api/tasks/:id               # Modifier une tâche
DELETE /api/tasks/:id               # Supprimer une tâche
GET    /api/tasks/stats/stats       # Statistiques
GET    /api/tasks/search/:term      # Recherche
GET    /api/tasks/by-mission-type/:typeId  # Par type de mission
```

### **Endpoints d'association**
```
POST   /api/tasks/:id/mission-types     # Ajouter association
DELETE /api/tasks/:id/mission-types/:missionTypeId  # Retirer association
```

## 📋 **DONNÉES DE TEST**

### **10 tâches créées**
1. **AUDIT_COMPTES** : Audit des comptes (40h, HAUTE)
2. **VERIF_FISCALE** : Vérification fiscale (24h, HAUTE)
3. **RAPPORT_FINAL** : Rapport final (16h, CRITIQUE)
4. **CONSEIL_STRATEGIE** : Conseil en stratégie (32h, HAUTE)
5. **FORMATION_EQUIPE** : Formation de l'équipe (20h, MOYENNE)
6. **ANALYSE_RISQUES** : Analyse des risques (28h, HAUTE)
7. **OPTIMISATION_PROCESS** : Optimisation des processus (36h, MOYENNE)
8. **CONTROLE_INTERNE** : Contrôle interne (24h, HAUTE)
9. **PLANIFICATION_FISCALE** : Planification fiscale (32h, CRITIQUE)
10. **SUIVI_CONFORMITE** : Suivi de conformité (16h, MOYENNE)

### **21 associations créées**
- **AU003** : 4 tâches (3 obligatoires)
- **BA001** : 3 tâches (3 obligatoires)
- **CONSEIL** : 3 tâches (1 obligatoire)
- **DEV** : 2 tâches (1 obligatoire)
- **FINANCE** : 3 tâches (3 obligatoires)
- **FISCAL** : 3 tâches (2 obligatoires)
- **FORMATION** : 1 tâche (1 obligatoire)
- **JURIDIQUE** : 2 tâches (1 obligatoire)

## 🚨 **DÉPANNAGE**

### **Problèmes courants**

#### **Erreur "Code déjà existant"**
- **Cause** : Code de tâche déjà utilisé
- **Solution** : Choisir un code unique

#### **Tâche non visible**
- **Cause** : Statut inactif
- **Solution** : Réactiver dans l'édition

#### **Associations manquantes**
- **Cause** : Pas d'association créée
- **Solution** : Utiliser les endpoints d'association

#### **Erreur de validation**
- **Cause** : Champs obligatoires manquants
- **Solution** : Remplir tous les champs marqués *

### **Logs et débogage**
- **Console navigateur** : Erreurs JavaScript
- **Logs serveur** : Erreurs API
- **Base de données** : Vérification des contraintes

## 🔮 **ÉVOLUTIONS FUTURES**

### **Fonctionnalités prévues**
- **Planification** : Dates de début/fin des tâches
- **Assignations** : Attribution du personnel
- **Suivi temps** : Heures réelles vs planifiées
- **Notifications** : Alertes sur les tâches
- **Workflow** : Progression automatique

### **Intégrations**
- **Missions** : Sélection automatique des tâches
- **Feuilles de temps** : Saisie par tâche
- **Rapports** : Analyses détaillées
- **Dashboard** : KPIs des tâches

## 📞 **SUPPORT**

### **Documentation technique**
- **Modèle Task.js** : Méthodes et propriétés
- **Migration 029** : Structure de base de données
- **Tests** : Script `test-tasks-module.js`

### **Contact**
- **Développeur** : Assistant IA
- **Date de création** : 31/07/2025
- **Version** : 1.0.0

---

*Ce guide couvre toutes les fonctionnalités du module Tâches. Pour toute question ou problème, consulter la documentation technique ou les logs d'erreur.* 