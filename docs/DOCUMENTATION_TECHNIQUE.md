# Documentation Technique - EB-Vision 2.0

**Version** : 2.0  
**Dernière mise à jour** : 29 octobre 2025  
**Statut** : Production Ready

---

## 📑 Table des Matières

1. [Vue d'ensemble du projet](#1-vue-densemble-du-projet)
2. [Architecture technique](#2-architecture-technique)
3. [Stack technologique](#3-stack-technologique)
4. [Structure du projet](#4-structure-du-projet)
5. [Base de données](#5-base-de-données)
6. [Système d'authentification et sécurité](#6-système-dauthentification-et-sécurité)
7. [Système de rôles et permissions](#7-système-de-rôles-et-permissions)
8. [Modules fonctionnels](#8-modules-fonctionnels)
9. [API et Routes](#9-api-et-routes)
10. [Configuration et déploiement](#10-configuration-et-déploiement)
11. [Scripts et outils](#11-scripts-et-outils)
12. [Développement](#12-développement)
13. [Maintenance et évolution](#13-maintenance-et-évolution)

---

## 1. Vue d'ensemble du projet

### 1.1 Présentation

**EB-Vision 2.0** est une application web complète de gestion d'entreprise destinée aux cabinets pluridisciplinaires (audit, comptabilité, finance, juridique, fiscalité et gouvernance).

### 1.2 Objectifs principaux

- **Gestion clientèle et commerciale** : CRM avancé avec segmentation et lead scoring
- **Gestion des missions et projets** : Planification, suivi et facturation
- **Gestion des temps** : Saisie, validation et analyse de rentabilité
- **Gestion RH** : Évaluation, compétences et carrières
- **Pilotage et analytics** : Tableaux de bord temps réel et KPI stratégiques
- **Système de permissions avancé** : Contrôle d'accès granulaire par rôles et permissions

### 1.3 Périmètre fonctionnel

L'application couvre **6 modules principaux** interconnectés :

1. **Module CRM** - Gestion clientèle et prospects
2. **Module Commercial** - Opportunités et campagnes de prospection
3. **Module Missions** - Gestion de projets et livrables
4. **Module Temps** - Feuilles de temps et activités
5. **Module Rentabilité** - Analyses financières et marges
6. **Module RH** - Collaborateurs, évaluations et évolutions

---

## 2. Architecture technique

### 2.1 Architecture globale

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (HTML/JS/CSS)                    │
│  - Pages statiques HTML                                      │
│  - JavaScript vanilla (ES6+)                                 │
│  - CSS moderne avec responsive design                        │
│  - Composants réutilisables                                  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/HTTPS (REST API)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js/Express)                 │
│  - Serveur Express                                           │
│  - Middleware d'authentification JWT                         │
│  - Middleware de sécurité (Helmet, CORS, Rate Limiting)     │
│  - Routes API RESTful                                        │
│  - Services métier                                           │
└────────────────────────┬────────────────────────────────────┘
                         │ PostgreSQL Protocol
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    BASE DE DONNÉES (PostgreSQL)              │
│  - Schéma relationnel                                        │
│  - Triggers et fonctions                                     │
│  - Indexes optimisés                                         │
│  - Pool de connexions                                        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Architecture des dossiers

```
eb-vision-2.0/
├── public/              # Frontend - Interface utilisateur
│   ├── js/             # Scripts JavaScript
│   ├── css/            # Feuilles de style
│   └── *.html          # Pages HTML
├── src/                # Backend - Code source
│   ├── middleware/     # Middlewares Express
│   ├── models/         # Modèles de données (ORM-like)
│   ├── routes/         # Routes API
│   ├── services/       # Services métier
│   └── utils/          # Utilitaires
├── migrations/         # Scripts de migration de base de données
├── scripts/            # Scripts utilitaires et de déploiement
├── docs/               # Documentation
├── database/           # Configuration et seeds de base de données
├── uploads/            # Fichiers uploadés par les utilisateurs
├── logs/               # Fichiers de logs
├── server.js           # Point d'entrée de l'application
├── package.json        # Dépendances Node.js
└── .env               # Configuration d'environnement
```

### 2.3 Modèle de données conceptuel

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Users     │────<│  User_Roles  │>────│    Roles     │
└──────────────┘     └──────────────┘     └──────────────┘
       │                                          │
       │                                          │
       ▼                                          ▼
┌──────────────┐                         ┌──────────────┐
│Collaborateurs│                         │ Permissions  │
└──────────────┘                         └──────────────┘
       │
       ├────> Business Units
       ├────> Divisions
       ├────> Grades
       └────> Postes

┌──────────────┐     ┌──────────────┐
│   Clients    │────<│  Missions    │
└──────────────┘     └──────────────┘
       │                    │
       ▼                    ▼
┌──────────────┐     ┌──────────────┐
│Opportunités  │     │Time Entries  │
└──────────────┘     └──────────────┘
```

---

## 3. Stack technologique

### 3.1 Backend

| Technologie | Version | Rôle |
|------------|---------|------|
| **Node.js** | 18+ | Runtime JavaScript serveur |
| **Express** | 4.18+ | Framework web |
| **PostgreSQL** | 14+ | Base de données relationnelle |
| **bcryptjs** | 2.4+ | Hachage des mots de passe |
| **jsonwebtoken** | 9.0+ | Authentification JWT |
| **pg** | 8.11+ | Driver PostgreSQL |
| **Joi** | 17.11+ | Validation de schémas |
| **Helmet** | 7.1+ | Sécurité HTTP headers |
| **CORS** | 2.8+ | Cross-Origin Resource Sharing |
| **express-rate-limit** | 7.1+ | Protection contre le spam |
| **morgan** | 1.10+ | Logging HTTP |
| **compression** | 1.7+ | Compression GZIP |
| **multer** | 2.0+ | Upload de fichiers |
| **nodemailer** | 7.0+ | Envoi d'emails |
| **node-cron** | 4.2+ | Tâches planifiées |
| **speakeasy** | 2.0+ | 2FA (TOTP) |
| **qrcode** | 1.5+ | Génération QR codes |
| **PM2** | 5.3+ | Process manager (production) |

### 3.2 Frontend

| Technologie | Version | Rôle |
|------------|---------|------|
| **HTML5** | - | Structure des pages |
| **CSS3** | - | Styles et responsive design |
| **JavaScript (ES6+)** | - | Logique client |
| **Fetch API** | - | Requêtes HTTP |
| **LocalStorage** | - | Stockage local |

### 3.3 Outils de développement

- **nodemon** : Hot reload en développement
- **dotenv** : Gestion des variables d'environnement
- **Git** : Versioning du code

---

## 4. Structure du projet

### 4.1 Backend (`src/`)

#### 4.1.1 Middleware (`src/middleware/`)

```javascript
auth.js                    // Authentification JWT et vérification des rôles
cookieAuth.js              // Authentification via cookies
errorHandler.js            // Gestion centralisée des erreurs
permissions.js             // Vérification des permissions
superAdminRateLimiter.js   // Rate limiting spécifique aux super admins
upload.js                  // Gestion des uploads de fichiers
```

#### 4.1.2 Modèles (`src/models/`)

```javascript
User.js                    // Utilisateurs
Collaborateur.js           // Collaborateurs/employés
BusinessUnit.js            // Business Units (entités)
Division.js                // Divisions
Client.js                  // Clients
Contact.js                 // Contacts clients
Mission.js                 // Missions/projets
Opportunity.js             // Opportunités commerciales
TimeSheet.js               // Feuilles de temps
Invoice.js                 // Factures
// ... et 20+ autres modèles
```

#### 4.1.3 Routes (`src/routes/`)

```javascript
auth.js                    // Authentification (login, logout, 2FA)
users.js                   // Gestion des utilisateurs
collaborateurs.js          // Gestion des collaborateurs
business-units.js          // Business Units
clients.js                 // Clients
missions.js                // Missions
opportunities.js           // Opportunités
time-sheets.js             // Feuilles de temps
permissions.js             // Permissions
// ... et 30+ autres routes
```

#### 4.1.4 Services (`src/services/`)

```javascript
cronService.js             // Tâches planifiées
emailService.js            // Envoi d'emails
notificationService.js     // Notifications système
twoFactorAuth.js          // Authentification 2FA
passwordPolicy.js          // Politique de mots de passe
securityMonitoring.js      // Monitoring de sécurité
```

#### 4.1.5 Utilitaires (`src/utils/`)

```javascript
database.js                // Configuration et pool de connexions PostgreSQL
validators.js              // Schémas de validation Joi
PermissionManager.js       // Gestion des permissions
roleColors.js              // Couleurs des rôles
superAdminHelper.js        // Utilitaires pour super admin
csv-importer.js           // Import de données CSV
```

### 4.2 Frontend (`public/`)

#### 4.2.1 Pages principales

```
dashboard.html             // Tableau de bord principal
users.html                 // Gestion des utilisateurs
collaborateurs.html        // Gestion des collaborateurs
clients.html               // Gestion des clients
missions.html              // Gestion des missions
opportunities.html         // Gestion des opportunités
time-sheet-modern.html     // Saisie de temps moderne
analytics.html             // Tableaux de bord analytiques
permissions-admin.html     // Administration des permissions
// ... et 50+ autres pages
```

#### 4.2.2 JavaScript (`public/js/`)

```javascript
auth.js                    // Authentification client
global-auth.js             // Gestion globale de l'authentification
page-permissions.js        // Vérification des permissions de page
menu-permissions.js        // Gestion des menus selon permissions
modern-sidebar.js          // Sidebar moderne
session-manager.js         // Gestion des sessions
notifications.js           // Notifications utilisateur
// ... et 20+ autres scripts
```

#### 4.2.3 Styles (`public/css/`)

```css
global.css                 // Styles globaux
sidebar.css                // Sidebar
dashboard.css              // Tableaux de bord
forms.css                  // Formulaires
tables.css                 // Tableaux
responsive.css             // Responsive design
// ... et autres fichiers CSS
```

---

## 5. Base de données

### 5.1 Configuration

**SGBD** : PostgreSQL 14+  
**Nom de la base** : `eb_vision_2_0` (par défaut)  
**Encodage** : UTF-8  
**Timezone** : UTC

### 5.2 Connexion

```javascript
// src/utils/database.js
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    max: 20,                      // Pool de 20 connexions
    idleTimeoutMillis: 30000,     // Timeout des connexions inactives
    connectionTimeoutMillis: 2000 // Timeout de connexion
});
```

### 5.3 Tables principales

#### 5.3.1 Utilisateurs et authentification

```sql
-- Table users : Utilisateurs de l'application
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    login VARCHAR(50) UNIQUE NOT NULL,
    role VARCHAR(50),                    -- Legacy, pour compatibilité
    statut VARCHAR(20) DEFAULT 'ACTIF',
    collaborateur_id UUID REFERENCES collaborateurs(id),
    last_login TIMESTAMP WITH TIME ZONE,
    last_logout TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table roles : Définition des rôles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table user_roles : Association utilisateurs <-> rôles (N-N)
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- Table permissions : Définition des permissions
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    module VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table role_permissions : Association rôles <-> permissions (N-N)
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- Table user_permissions : Permissions spécifiques d'un utilisateur
CREATE TABLE user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, permission_id)
);
```

#### 5.3.2 Organisation et RH

```sql
-- Business Units : Entités juridiques
CREATE TABLE business_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    statut VARCHAR(20) DEFAULT 'ACTIF',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Divisions : Divisions au sein des Business Units
CREATE TABLE divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    business_unit_id UUID REFERENCES business_units(id),
    description TEXT,
    statut VARCHAR(20) DEFAULT 'ACTIF',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grades : Grades hiérarchiques
CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    niveau INTEGER,
    taux_horaire_min DECIMAL(10, 2),
    taux_horaire_max DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Postes : Fonctions/métiers
CREATE TABLE postes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collaborateurs : Employés de l'entreprise
CREATE TABLE collaborateurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricule VARCHAR(50) UNIQUE NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telephone VARCHAR(20),
    date_entree DATE,
    date_sortie DATE,
    business_unit_id UUID REFERENCES business_units(id),
    division_id UUID REFERENCES divisions(id),
    grade_actuel_id UUID REFERENCES grades(id),
    poste_actuel_id UUID REFERENCES postes(id),
    manager_id UUID REFERENCES collaborateurs(id),
    user_id UUID REFERENCES users(id),
    photo_url VARCHAR(500),
    statut VARCHAR(20) DEFAULT 'ACTIF',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5.3.3 CRM et Commercial

```sql
-- Clients
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raison_sociale VARCHAR(255) NOT NULL,
    siret VARCHAR(14),
    forme_juridique VARCHAR(100),
    secteur_activite_id UUID REFERENCES secteurs_activite(id),
    pays_id UUID REFERENCES pays(id),
    adresse TEXT,
    code_postal VARCHAR(10),
    ville VARCHAR(100),
    telephone VARCHAR(20),
    email VARCHAR(255),
    site_web VARCHAR(255),
    business_unit_id UUID REFERENCES business_units(id),
    statut VARCHAR(20) DEFAULT 'ACTIF',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contacts : Interlocuteurs chez les clients
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    fonction VARCHAR(100),
    email VARCHAR(255),
    telephone VARCHAR(20),
    mobile VARCHAR(20),
    principal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Opportunités commerciales
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    client_id UUID REFERENCES clients(id),
    opportunity_type_id UUID REFERENCES opportunity_types(id),
    stage_id UUID REFERENCES opportunity_stages(id),
    montant_estime DECIMAL(12, 2),
    probabilite INTEGER CHECK (probabilite >= 0 AND probabilite <= 100),
    date_cloture_prevue DATE,
    responsable_id UUID REFERENCES users(id),
    business_unit_id UUID REFERENCES business_units(id),
    statut VARCHAR(50) DEFAULT 'EN_COURS',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5.3.4 Missions et Projets

```sql
-- Missions
CREATE TABLE missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    client_id UUID REFERENCES clients(id),
    mission_type_id UUID REFERENCES mission_types(id),
    date_debut DATE,
    date_fin_prevue DATE,
    date_fin_reelle DATE,
    budget_estime DECIMAL(12, 2),
    budget_consomme DECIMAL(12, 2),
    responsable_id UUID REFERENCES collaborateurs(id),
    business_unit_id UUID REFERENCES business_units(id),
    statut VARCHAR(50) DEFAULT 'PLANIFIEE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tâches de missions
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    assignee_id UUID REFERENCES collaborateurs(id),
    date_debut DATE,
    date_fin DATE,
    statut VARCHAR(50) DEFAULT 'TODO',
    priorite VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5.3.5 Gestion du temps

```sql
-- Feuilles de temps
CREATE TABLE time_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaborateur_id UUID REFERENCES collaborateurs(id),
    periode_debut DATE NOT NULL,
    periode_fin DATE NOT NULL,
    statut VARCHAR(50) DEFAULT 'DRAFT',
    total_heures DECIMAL(6, 2),
    soumis_le TIMESTAMP WITH TIME ZONE,
    valide_le TIMESTAMP WITH TIME ZONE,
    valide_par_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Entrées de temps
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time_sheet_id UUID REFERENCES time_sheets(id) ON DELETE CASCADE,
    mission_id UUID REFERENCES missions(id),
    activite_id UUID REFERENCES activities(id),
    date_travail DATE NOT NULL,
    heures DECIMAL(5, 2) NOT NULL,
    description TEXT,
    facturable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5.4 Migrations

Les migrations se trouvent dans le dossier `migrations/` :

```
migrations/
├── 001_recreate_time_sheets_tables.sql
├── 002_fix_time_sheets_missing_columns.sql
├── 003_add_unique_constraint_companies.sql
├── 004_create_super_admin_audit_log.sql
├── 005_create_sync_tables.sql
└── 006_migrate_users_to_multi_roles.sql
```

**Exécution d'une migration** :
```bash
psql -U postgres -d eb_vision_2_0 -f migrations/001_migration.sql
```

### 5.5 Seeds

Les données initiales se trouvent dans `database/seeds/` :

```bash
psql -U postgres -d eb_vision_2_0 -f database/seeds/001_initial_data.sql
```

---

## 6. Système d'authentification et sécurité

### 6.1 Authentification JWT

#### 6.1.1 Flux d'authentification

```
1. Client envoie email + password
   ↓
2. Serveur vérifie les credentials
   ↓
3. Serveur génère un JWT token
   ↓
4. Client stocke le token (localStorage + Cookie)
   ↓
5. Client envoie le token dans les requêtes suivantes
   (Header: Authorization: Bearer <token>)
   ↓
6. Serveur vérifie le token à chaque requête
```

#### 6.1.2 Structure du token JWT

```javascript
{
    id: "uuid-user",
    email: "user@example.com",
    nom: "Dupont",
    prenom: "Jean",
    roles: ["ADMIN", "MANAGER"],  // Rôles multiples
    permissions: ["users:read", "users:create", ...],
    iat: 1698765432,              // Issued at
    exp: 1698851832               // Expiration (24h par défaut)
}
```

#### 6.1.3 Configuration JWT

```javascript
// .env
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h
```

### 6.2 Authentification 2FA (Two-Factor Authentication)

EB-Vision 2.0 supporte l'authentification à deux facteurs via **TOTP (Time-based One-Time Password)**.

#### 6.2.1 Activation du 2FA

```javascript
// 1. Générer un secret 2FA
POST /api/2fa/setup
// Retourne : { secret, qrCode }

// 2. Vérifier le code et activer
POST /api/2fa/verify
Body: { secret, token }

// 3. Récupérer les codes de récupération
POST /api/2fa/backup-codes
// Retourne : { backupCodes: ["code1", "code2", ...] }
```

#### 6.2.2 Connexion avec 2FA

```javascript
// 1. Login initial
POST /api/auth/login
Body: { email, password }
// Retourne : { requires2FA: true, userId }

// 2. Vérifier le code 2FA
POST /api/auth/login-2fa
Body: { userId, token }
// Retourne : { token, user }
```

### 6.3 Sécurité

#### 6.3.1 Middleware de sécurité

```javascript
// server.js
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            connectSrc: ["'self'", "http://localhost:3000"]
        }
    }
}));
```

#### 6.3.2 Rate Limiting

```javascript
// Protection anti-brute force sur l'authentification
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 20,                    // 20 tentatives max
    message: 'Trop de tentatives de connexion'
});

app.use('/api/auth', authLimiter);
```

#### 6.3.3 Politique de mots de passe

```javascript
// Service: passwordPolicy.js
const passwordRequirements = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbidCommonPasswords: true,
    forbidUserInfo: true  // Empêche l'utilisation du nom, prénom, email
};
```

#### 6.3.4 Hachage des mots de passe

```javascript
// Utilisation de bcrypt avec 12 rounds
const bcrypt = require('bcryptjs');
const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
const passwordHash = await bcrypt.hash(password, saltRounds);
```

### 6.4 Protection CSRF

Les requêtes sensibles utilisent une combinaison de :
- **Tokens JWT** dans les headers
- **Cookies HttpOnly et SameSite**
- **Validation de l'origine** (CORS)

---

## 7. Système de rôles et permissions

### 7.1 Architecture du système

EB-Vision 2.0 utilise un système de **rôles multiples** où un utilisateur peut avoir plusieurs rôles simultanément.

### 7.2 Hiérarchie des rôles

```javascript
const ROLE_HIERARCHY = {
    'SUPER_ADMIN': 10,    // Accès total
    'ADMIN': 9,           // Administration
    'ADMIN_IT': 8,        // Administration IT
    'ASSOCIE': 7,         // Partenaire/Associé
    'DIRECTEUR': 6,       // Directeur
    'MANAGER': 5,         // Manager
    'SUPERVISEUR': 4,     // Superviseur
    'CONSULTANT': 3,      // Consultant
    'COLLABORATEUR': 2,   // Collaborateur
    'USER': 1             // Utilisateur basique
};
```

### 7.3 Permissions

Les permissions sont granulaires et organisées par module :

```javascript
// Exemples de permissions
permissions = [
    // Utilisateurs
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    
    // Clients
    'clients:read',
    'clients:create',
    'clients:update',
    'clients:delete',
    
    // Missions
    'missions:read',
    'missions:create',
    'missions:update',
    'missions:delete',
    
    // Temps
    'timesheets:read',
    'timesheets:create',
    'timesheets:validate',
    
    // ... etc.
];
```

### 7.4 Vérification des permissions

#### 7.4.1 Backend

```javascript
// Middleware de vérification de rôle
const { requireRole } = require('../middleware/auth');

router.get('/admin-only', requireRole(['ADMIN', 'SUPER_ADMIN']), (req, res) => {
    // Code accessible uniquement aux ADMIN et SUPER_ADMIN
});

// Middleware de vérification de permission
const { requirePermission } = require('../middleware/auth');

router.delete('/users/:id', requirePermission('users:delete'), (req, res) => {
    // Code accessible uniquement avec la permission users:delete
});
```

#### 7.4.2 Frontend

```javascript
// public/js/page-permissions.js
class PagePermissions {
    getCurrentUserRole() {
        const userData = localStorage.getItem('user');
        const user = JSON.parse(userData);
        
        // Support des rôles multiples
        if (user.roles && Array.isArray(user.roles)) {
            // SUPER_ADMIN a priorité
            if (user.roles.includes('SUPER_ADMIN')) {
                return 'SUPER_ADMIN';
            }
            return user.roles[0]; // Premier rôle sinon
        }
        
        return user.role || 'USER';
    }
    
    checkPageAccess(pageName) {
        const role = this.getCurrentUserRole();
        
        // SUPER_ADMIN a accès à tout
        if (role === 'SUPER_ADMIN') return true;
        
        // Vérification selon la configuration des permissions
        const pagePermissions = this.getPagePermissions(pageName);
        return pagePermissions.allowedRoles.includes(role);
    }
}
```

### 7.5 Filtrage par Business Unit

Les utilisateurs peuvent avoir des accès limités à certaines Business Units :

```javascript
// Exemple de requête filtrée
const missions = await Mission.findAll({
    business_unit_id: req.user.business_unit_id  // Filtre automatique
});
```

---

## 8. Modules fonctionnels

### 8.1 Module CRM (Gestion clientèle)

**Pages** :
- `clients.html` - Liste et gestion des clients
- `client-details.html` - Détails d'un client

**Fonctionnalités** :
- Fiche client enrichie (informations générales, contacts, documents)
- Segmentation automatique
- Historique des interactions
- Géolocalisation

**API Routes** :
```javascript
GET    /api/clients           // Liste des clients
POST   /api/clients           // Créer un client
GET    /api/clients/:id       // Détails d'un client
PUT    /api/clients/:id       // Modifier un client
DELETE /api/clients/:id       // Supprimer un client
```

### 8.2 Module Commercial (Opportunités)

**Pages** :
- `opportunities.html` - Gestion des opportunités
- `opportunity-details.html` - Détails d'une opportunité
- `opportunity-types.html` - Types d'opportunités
- `opportunity-stages.html` - Étapes du pipeline

**Fonctionnalités** :
- Pipeline visuel (Kanban)
- Lead scoring automatique
- Workflow personnalisable par type d'opportunité
- Campagnes de prospection

**API Routes** :
```javascript
GET    /api/opportunities            // Liste des opportunités
POST   /api/opportunities            // Créer une opportunité
GET    /api/opportunities/:id        // Détails
PUT    /api/opportunities/:id        // Modifier
DELETE /api/opportunities/:id        // Supprimer
POST   /api/opportunities/:id/stage  // Changer d'étape
```

### 8.3 Module Missions

**Pages** :
- `missions.html` - Liste des missions
- `mission-details.html` - Détails d'une mission
- `create-mission-step1.html` - Création (étape 1)
- `create-mission-step2.html` - Création (étape 2)
- `create-mission-step3.html` - Création (étape 3)
- `create-mission-step4.html` - Création (étape 4)

**Fonctionnalités** :
- Création de missions multi-étapes
- Planification et affectation des ressources
- Suivi du budget (prévisionnel vs. consommé)
- Gestion des livrables
- Facturation intégrée

**API Routes** :
```javascript
GET    /api/missions              // Liste des missions
POST   /api/missions              // Créer une mission
GET    /api/missions/:id          // Détails
PUT    /api/missions/:id          // Modifier
DELETE /api/missions/:id          // Supprimer
GET    /api/missions/:id/tasks    // Tâches de la mission
POST   /api/missions/:id/tasks    // Créer une tâche
```

### 8.4 Module Temps

**Pages** :
- `time-sheet-modern.html` - Saisie de temps moderne
- `time-sheet-approvals.html` - Validation des feuilles de temps
- `time-sheet-supervisors.html` - Gestion des superviseurs

**Fonctionnalités** :
- Saisie intuitive (drag & drop, templates)
- Validation hiérarchique
- Mode offline avec synchronisation
- Contrôles de cohérence automatiques

**API Routes** :
```javascript
GET    /api/time-sheets                    // Feuilles de temps
POST   /api/time-sheets                    // Créer
GET    /api/time-sheets/:id                // Détails
PUT    /api/time-sheets/:id                // Modifier
POST   /api/time-sheets/:id/submit         // Soumettre
POST   /api/time-sheets/:id/approve        // Approuver
GET    /api/time-entries                   // Entrées de temps
POST   /api/time-entries                   // Créer
```

### 8.5 Module Rentabilité

**Pages** :
- `analytics.html` - Tableaux de bord analytiques
- `dashboard-rentabilite.html` - Dashboard rentabilité
- `dashboard-chargeabilite.html` - Dashboard chargeabilité
- `dashboard-recouvrement.html` - Dashboard recouvrement

**Fonctionnalités** :
- Calcul de rentabilité par mission
- Analyses multi-dimensionnelles (client, service, collaborateur)
- Prévisions et simulations
- KPI temps réel

**API Routes** :
```javascript
GET /api/analytics/rentabilite              // Rentabilité globale
GET /api/analytics/rentabilite/mission/:id  // Par mission
GET /api/analytics/chargeabilite            // Taux de chargeabilité
GET /api/analytics/recouvrement             // Recouvrement
```

### 8.6 Module RH (Collaborateurs)

**Pages** :
- `collaborateurs.html` - Gestion des collaborateurs
- `grades.html` - Gestion des grades
- `postes.html` - Gestion des postes
- `business-units.html` - Business Units
- `divisions.html` - Divisions

**Fonctionnalités** :
- Fiche collaborateur complète
- Gestion des évolutions (grade, poste, organisation)
- Évaluation 360°
- Plans de développement

**API Routes** :
```javascript
GET    /api/collaborateurs         // Liste
POST   /api/collaborateurs         // Créer
GET    /api/collaborateurs/:id     // Détails
PUT    /api/collaborateurs/:id     // Modifier
DELETE /api/collaborateurs/:id     // Supprimer
GET    /api/grades                 // Grades
GET    /api/postes                 // Postes
```

---

## 9. API et Routes

### 9.1 Convention de nommage

Toutes les routes API suivent le pattern REST :

```
GET    /api/resource          // Liste (avec pagination)
POST   /api/resource          // Créer
GET    /api/resource/:id      // Détails
PUT    /api/resource/:id      // Modifier (update complet)
PATCH  /api/resource/:id      // Modifier (update partiel)
DELETE /api/resource/:id      // Supprimer
```

### 9.2 Format des réponses

#### 9.2.1 Succès

```javascript
{
    "success": true,
    "message": "Opération réussie",
    "data": {
        // Données retournées
    }
}
```

#### 9.2.2 Erreur

```javascript
{
    "success": false,
    "message": "Message d'erreur",
    "errors": [
        "Détail erreur 1",
        "Détail erreur 2"
    ]
}
```

### 9.3 Pagination

Les listes utilisent la pagination :

```javascript
// Requête
GET /api/users?page=2&limit=20&search=dupont&statut=ACTIF

// Réponse
{
    "success": true,
    "data": {
        "users": [...],
        "pagination": {
            "page": 2,
            "limit": 20,
            "total": 150,
            "pages": 8
        }
    }
}
```

### 9.4 Validation

Toutes les données entrantes sont validées avec **Joi** :

```javascript
// src/utils/validators.js
const Joi = require('joi');

const userValidation = {
    create: Joi.object({
        nom: Joi.string().min(2).max(100).required(),
        prenom: Joi.string().min(2).max(100).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
        roles: Joi.array().items(Joi.string().uuid()).min(1).required()
    })
};
```

### 9.5 Routes principales

| Module | Route | Fichier |
|--------|-------|---------|
| Authentification | `/api/auth/*` | `src/routes/auth.js` |
| Utilisateurs | `/api/users/*` | `src/routes/users.js` |
| Collaborateurs | `/api/collaborateurs/*` | `src/routes/collaborateurs.js` |
| Clients | `/api/clients/*` | `src/routes/clients.js` |
| Missions | `/api/missions/*` | `src/routes/missions.js` |
| Opportunités | `/api/opportunities/*` | `src/routes/opportunities.js` |
| Temps | `/api/time-sheets/*` | `src/routes/time-sheets.js` |
| Permissions | `/api/permissions/*` | `src/routes/permissions.js` |
| Analytics | `/api/analytics/*` | `src/routes/analytics.js` |

---

## 10. Configuration et déploiement

### 10.1 Variables d'environnement

Créer un fichier `.env` à la racine :

```bash
# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=eb_vision_2_0
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h

# Serveur
PORT=3000
NODE_ENV=development

# Sécurité
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
AUTH_RATE_LIMIT_MAX=20

# Logs
LOG_LEVEL=info
```

### 10.2 Installation

```bash
# 1. Cloner le dépôt
git clone <repository-url>
cd eb-vision-2.0

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp env.example .env
# Éditer .env avec vos valeurs

# 4. Créer la base de données
createdb eb_vision_2_0

# 5. Exécuter les migrations
psql -U postgres -d eb_vision_2_0 -f migrations/001_*.sql
# ... pour chaque migration

# 6. Charger les données initiales (seeds)
psql -U postgres -d eb_vision_2_0 -f database/seeds/001_initial_data.sql

# 7. Démarrer le serveur
npm start
# ou en mode développement
npm run dev
```

### 10.3 Déploiement en production

#### 10.3.1 Avec PM2

```bash
# Installer PM2 globalement
npm install -g pm2

# Démarrer l'application
pm2 start ecosystem.config.js --env production

# Voir les logs
pm2 logs eb-vision-2.0

# Monitoring
pm2 monit

# Redémarrer
pm2 restart eb-vision-2.0

# Arrêter
pm2 stop eb-vision-2.0
```

#### 10.3.2 Configuration PM2 (`ecosystem.config.js`)

```javascript
module.exports = {
    apps: [{
        name: 'eb-vision-2.0',
        script: './server.js',
        instances: 'max',
        exec_mode: 'cluster',
        env_production: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        error_file: './logs/err.log',
        out_file: './logs/out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }]
};
```

### 10.4 Déploiement avec Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=db
      - DB_NAME=eb_vision_2_0
    depends_on:
      - db
  
  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=eb_vision_2_0
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```bash
# Démarrer avec Docker Compose
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter
docker-compose down
```

---

## 11. Scripts et outils

### 11.1 Scripts NPM

```bash
# Démarrage
npm start              # Mode production
npm run dev            # Mode développement (avec nodemon)

# Tests
npm test               # Tests simples
npm run test:api       # Tests API complets
npm run test:ui        # Tests UI

# Déploiement
npm run deploy         # Déployer et documenter
npm run status         # Vérifier le statut

# PM2
npm run pm2:start      # Démarrer avec PM2
npm run pm2:stop       # Arrêter
npm run pm2:restart    # Redémarrer
npm run pm2:logs       # Voir les logs
npm run pm2:monit      # Monitoring
```

### 11.2 Scripts utilitaires

Le dossier `scripts/` contient 200+ scripts utilitaires :

#### 11.2.1 Scripts de base de données

```bash
node scripts/create-admin-user.js                    # Créer un utilisateur admin
node scripts/migrate-to-multi-roles.js               # Migration rôles multiples
node scripts/check-database-status.js                # Vérifier l'état de la BDD
node scripts/fix-database-consistency.js             # Corriger les incohérences
```

#### 11.2.2 Scripts de sécurité

```bash
node scripts/security-audit.js                       # Audit de sécurité complet
node scripts/security-audit-passwords.js             # Audit des mots de passe
node scripts/fix-non-bcrypt-passwords.js             # Corriger les mots de passe
node scripts/generate-secure-jwt-key.js              # Générer une clé JWT sécurisée
```

#### 11.2.3 Scripts de déploiement

```bash
bash scripts/restart-server.sh                       # Redémarrer le serveur
bash scripts/deploy-production-sync-complete.sh      # Sync complète en production
node scripts/verify-deployment.js                    # Vérifier le déploiement
```

### 11.3 Migrations

```bash
# Appliquer une migration
psql -U postgres -d eb_vision_2_0 -f migrations/006_migrate_users_to_multi_roles.sql

# Script Node.js pour migration
node scripts/migrate-to-multi-roles.js --dry-run     # Simulation
node scripts/migrate-to-multi-roles.js               # Exécution réelle
```

---

## 12. Développement

### 12.1 Workflow de développement

```bash
# 1. Créer une branche
git checkout -b feature/nouvelle-fonctionnalite

# 2. Développer
npm run dev  # Lance le serveur en mode watch

# 3. Tester
npm run test:api
npm run test:ui

# 4. Commit
git add .
git commit -m "feat: Ajout de la nouvelle fonctionnalité"

# 5. Push
git push origin feature/nouvelle-fonctionnalite

# 6. Créer une Pull Request
```

### 12.2 Standards de code

#### 12.2.1 JavaScript

- **Style** : ES6+ avec async/await
- **Indentation** : 4 espaces
- **Quotes** : Simple quotes (`'`)
- **Point-virgule** : Obligatoire

#### 12.2.2 Nommage

```javascript
// Variables et fonctions : camelCase
const userName = 'John';
function getUserData() {}

// Classes : PascalCase
class UserModel {}

// Constantes : UPPER_SNAKE_CASE
const MAX_RETRIES = 3;

// Fichiers : kebab-case
user-routes.js
permission-manager.js
```

#### 12.2.3 Commentaires

```javascript
/**
 * Description de la fonction
 * @param {string} userId - ID de l'utilisateur
 * @param {object} options - Options
 * @returns {Promise<User>} Utilisateur trouvé
 */
async function getUserById(userId, options = {}) {
    // Code...
}
```

### 12.3 Debugging

#### 12.3.1 Logs

```javascript
// Utilisation de console.log avec émojis pour clarté
console.log('✅ Succès:', data);
console.error('❌ Erreur:', error);
console.warn('⚠️ Attention:', warning);
console.log('🔍 Debug:', debugInfo);
```

#### 12.3.2 Debugging Node.js

```bash
# Avec Node Inspector
node --inspect server.js

# Avec VS Code
# Ajouter dans .vscode/launch.json :
{
    "type": "node",
    "request": "launch",
    "name": "Debug EB-Vision",
    "program": "${workspaceFolder}/server.js",
    "restart": true,
    "console": "integratedTerminal"
}
```

### 12.4 Tests

#### 12.4.1 Tests API

```bash
# Tests simples
node scripts/test-api-simple.js

# Tests complets
node scripts/test-api-comprehensive.js

# Test d'une route spécifique
node scripts/test-login.js
node scripts/test-user-creation.js
```

#### 12.4.2 Tests manuels

- Utiliser **Postman** ou **Insomnia** pour tester les API
- Collection Postman disponible dans `docs/postman/`

---

## 13. Maintenance et évolution

### 13.1 Monitoring

#### 13.1.1 Logs

```bash
# Logs en développement
npm run dev  # Affichage dans la console

# Logs en production avec PM2
pm2 logs eb-vision-2.0
pm2 logs eb-vision-2.0 --lines 100
pm2 logs eb-vision-2.0 --err  # Erreurs uniquement
```

#### 13.1.2 Monitoring PM2

```bash
pm2 monit              # Interface de monitoring
pm2 status             # Statut des processus
pm2 describe eb-vision-2.0  # Détails d'un processus
```

### 13.2 Sauvegardes

#### 13.2.1 Base de données

```bash
# Backup complet
pg_dump -U postgres -d eb_vision_2_0 > backup_$(date +%Y%m%d).sql

# Backup avec compression
pg_dump -U postgres -d eb_vision_2_0 | gzip > backup_$(date +%Y%m%d).sql.gz

# Restauration
psql -U postgres -d eb_vision_2_0 < backup_20251029.sql
```

#### 13.2.2 Fichiers

```bash
# Backup des uploads
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/

# Backup complet de l'application
tar -czf eb-vision-backup_$(date +%Y%m%d).tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=logs \
    .
```

### 13.3 Mises à jour

#### 13.3.1 Dépendances

```bash
# Vérifier les mises à jour
npm outdated

# Mettre à jour les dépendances mineures
npm update

# Mettre à jour une dépendance spécifique
npm update express

# Audit de sécurité
npm audit
npm audit fix
```

#### 13.3.2 Migrations de base de données

```bash
# 1. Créer le fichier de migration
touch migrations/007_nouvelle_migration.sql

# 2. Éditer le fichier
# ... SQL ...

# 3. Tester en local
psql -U postgres -d eb_vision_2_0_test -f migrations/007_nouvelle_migration.sql

# 4. Appliquer en production
psql -U postgres -d eb_vision_2_0 -f migrations/007_nouvelle_migration.sql
```

### 13.4 Performance

#### 13.4.1 Optimisations base de données

```sql
-- Analyser les requêtes lentes
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

-- Créer des index
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_collaborateurs_business_unit ON collaborateurs(business_unit_id);

-- Vacuum
VACUUM ANALYZE users;
```

#### 13.4.2 Optimisations Node.js

- Utiliser le **clustering** (PM2 avec `instances: 'max'`)
- Activer la **compression** GZIP
- Mettre en cache les requêtes fréquentes (Redis)
- Optimiser les requêtes SQL (éviter les N+1)

### 13.5 Sécurité

#### 13.5.1 Audits réguliers

```bash
# Audit des dépendances
npm audit

# Audit de sécurité complet
node scripts/comprehensive-security-audit.js

# Test de pénétration
node scripts/penetration-test.js
```

#### 13.5.2 Rotation des secrets

```bash
# Générer une nouvelle clé JWT
node scripts/generate-secure-jwt-key.js

# Mettre à jour dans .env
JWT_SECRET=nouvelle_cle_generee

# Redémarrer l'application
pm2 restart eb-vision-2.0
```

---

## 📚 Documentation complémentaire

### Fichiers de documentation

- `README.md` - Vue d'ensemble et démarrage rapide
- `README-PRODUCTION.md` - Guide de production
- `docs/SYSTÈME_RÔLES_MULTIPLES.md` - Système de rôles multiples
- `docs/MIGRATION_ROLES_MULTIPLES_README.md` - Migration des rôles
- `docs/GUIDE_MIGRATION_MULTI_ROLES.md` - Guide de migration
- `docs/CORRECTION_SUPER_ADMIN.md` - Corrections SUPER_ADMIN
- `docs/cahier-charges/specifications.md` - Cahier des charges complet
- `docs/Méthode de developpement/` - Méthodologie de développement

### Guides spécifiques

- **Création manuelle d'entreprise** : `docs/GUIDE_CREATION_MANUELLE_ENTREPRISE.md`
- **Harmonisation sélecteurs BU/Division** : `docs/GUIDE_HARMONISATION_SELECTEURS_BU_DIVISION.md`
- **Recherche de sigles** : `docs/GUIDE_RECHERCHE_SIGLES.md`
- **Corrections rapports** : `docs/GUIDE_CORRECTION_ERREURS_RAPPORTS.md`
- **Déploiement super admin** : `docs/SUPER_ADMIN_DEPLOYMENT_GUIDE.md`
- **Restrictions super admin** : `docs/SUPER_ADMIN_RESTRICTIONS.md`
- **Sécurité super admin** : `docs/SUPER_ADMIN_SECURITY_IMPLEMENTATION.md`

---

## 🆘 Support et contact

Pour toute question ou problème :

1. **Documentation** : Consulter les fichiers dans `docs/`
2. **Scripts de diagnostic** : Exécuter les scripts dans `scripts/`
3. **Logs** : Vérifier les logs avec `pm2 logs` ou dans `logs/`
4. **Issues** : Ouvrir une issue sur le dépôt Git

---

## 📄 Licence

**EB-Vision 2.0** - Tous droits réservés  
© 2024-2025 EB Vision Team

---

**Fin de la documentation technique**

*Document vivant - Mis à jour régulièrement*











