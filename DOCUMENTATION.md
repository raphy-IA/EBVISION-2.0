# TRS Dashboard - Documentation Technique

**Version:** 2.0.0
**Date:** 19/07/2025

## Sommaire

- [Vue d'ensemble](#vue-d'ensemble)
- [Architecture](#architecture)
- [API REST](#api-rest)
- [Base de données](#base-de-données)
- [Déploiement](#déploiement)
- [Guide d'utilisation](#guide-d'utilisation)
- [Maintenance](#maintenance)

## Vue d'ensemble


Le TRS Dashboard est une application web moderne pour la gestion des temps de travail.
Elle permet aux collaborateurs de saisir leurs heures de travail et aux managers de les valider.

## Fonctionnalités principales
- Saisie de temps de travail
- Validation des saisies
- Tableaux de bord avec statistiques
- Gestion des collaborateurs et missions
- Rapports et analyses
- Interface responsive et moderne
                

## Architecture


## Stack technologique
- **Backend**: Node.js + Express.js
- **Base de données**: PostgreSQL
- **Frontend**: HTML5, CSS3, JavaScript vanilla
- **UI Framework**: Bootstrap 5
- **Graphiques**: Chart.js
- **Icons**: FontAwesome

## Structure du projet
```
TRS-Affichage/
├── server.js                 # Point d'entrée du serveur
├── src/
│   ├── routes/              # Routes API
│   ├── models/              # Modèles de données
│   ├── middleware/          # Middlewares
│   └── utils/               # Utilitaires
├── public/                  # Fichiers statiques
├── scripts/                 # Scripts utilitaires
└── database/                # Migrations et schémas
```
                

## API REST


## Endpoints principaux

### Health Check
- `GET /api/health` - Statut de l'application

### Time Entries
- `GET /api/time-entries` - Liste des saisies
- `POST /api/time-entries` - Créer une saisie
- `GET /api/time-entries/statistics` - Statistiques
- `GET /api/time-entries/pending-validation` - Saisies en attente

### Collaborateurs
- `GET /api/collaborateurs` - Liste des collaborateurs

### Missions
- `GET /api/missions` - Liste des missions

### Grades
- `GET /api/grades` - Liste des grades
- `GET /api/grades/statistics` - Statistiques des grades

## Format des réponses
Toutes les réponses sont au format JSON avec la structure suivante :
```json
{
  "success": true,
  "data": [...],
  "message": "Message optionnel"
}
```
                

## Base de données


## Tables principales

### time_entries
- id (UUID, PK)
- user_id (UUID, FK)
- collaborateur_id (UUID, FK)
- mission_id (UUID, FK)
- date_saisie (DATE)
- heures (DECIMAL)
- description (TEXT)
- statut (ENUM: SAISIE, SOUMISE, VALIDEE, REJETEE)
- type_heures (ENUM: NORMALES, NUIT, WEEKEND, FERIE)
- date_creation (TIMESTAMP)
- date_modification (TIMESTAMP)

### collaborateurs
- id (UUID, PK)
- nom (VARCHAR)
- prenom (VARCHAR)
- email (VARCHAR)
- grade_id (UUID, FK)
- date_embauche (DATE)
- statut (ENUM: ACTIF, INACTIF)

### missions
- id (UUID, PK)
- titre (VARCHAR)
- description (TEXT)
- client_id (UUID, FK)
- date_debut (DATE)
- date_fin (DATE)
- statut (ENUM: EN_COURS, TERMINEE, ANNULEE)

### grades
- id (UUID, PK)
- nom (VARCHAR)
- taux_horaire (DECIMAL)
- description (TEXT)
                

## Déploiement


## Prérequis
- Node.js 18+
- PostgreSQL 12+
- npm ou yarn

## Installation

1. **Cloner le projet**
```bash
git clone <repository-url>
cd TRS-Affichage
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration de la base de données**
```bash
# Créer la base de données
createdb trs_affichage

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos paramètres
```

4. **Exécuter les migrations**
```bash
node scripts/run_migrations.js
```

5. **Démarrer le serveur**
```bash
npm run dev  # Développement
npm start    # Production
```

## Variables d'environnement
- `DB_HOST`: Hôte PostgreSQL (défaut: localhost)
- `DB_PORT`: Port PostgreSQL (défaut: 5432)
- `DB_NAME`: Nom de la base de données (défaut: trs_affichage)
- `DB_USER`: Utilisateur PostgreSQL (défaut: postgres)
- `DB_PASSWORD`: Mot de passe PostgreSQL
- `PORT`: Port du serveur (défaut: 3000)
- `NODE_ENV`: Environnement (development/production)
                

## Guide d'utilisation


## Interface utilisateur

### Tableau de bord
Le tableau de bord affiche :
- Statistiques générales (total saisies, validées, en attente)
- Graphiques de répartition
- Liste des saisies récentes
- Actions rapides

### Saisie de temps
1. Cliquer sur "Nouvelle saisie"
2. Sélectionner le collaborateur
3. Sélectionner la mission
4. Saisir la date et les heures
5. Ajouter une description (optionnel)
6. Enregistrer

### Validation
1. Accéder à la section "Validation"
2. Consulter les saisies en attente
3. Valider ou rejeter les saisies
4. Ajouter des commentaires si nécessaire

### Rapports
- Génération de rapports mensuels
- Export en PDF/Excel
- Analyses par collaborateur/mission
                

## Maintenance


## Scripts utilitaires

### Tests
```bash
# Test de l'API
node scripts/test_api_simple.js

# Test du frontend
node scripts/test_frontend.js

# Test complet du système
node scripts/test_api_comprehensive.js
```

### Base de données
```bash
# Générer un rapport système
node scripts/generate_system_report.js

# Vérifier l'intégrité des données
node scripts/check_data_integrity.js
```

### Sauvegarde
```bash
# Sauvegarde de la base de données
pg_dump trs_affichage > backup_$(date +%Y%m%d).sql

# Restauration
psql trs_affichage < backup_20250119.sql
```

## Monitoring
- Vérifier les logs du serveur
- Surveiller l'espace disque
- Contrôler les performances de la base de données
- Tester régulièrement les sauvegardes
                

