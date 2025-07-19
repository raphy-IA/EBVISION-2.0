const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Couleurs pour la console
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function generateDocumentation() {
    log('\n📚 Génération de la documentation...', 'cyan');
    
    const docs = {
        title: 'TRS Dashboard - Documentation Technique',
        version: '2.0.0',
        date: new Date().toISOString(),
        sections: {
            overview: {
                title: 'Vue d\'ensemble',
                content: `
Le TRS Dashboard est une application web moderne pour la gestion des temps de travail.
Elle permet aux collaborateurs de saisir leurs heures de travail et aux managers de les valider.

## Fonctionnalités principales
- Saisie de temps de travail
- Validation des saisies
- Tableaux de bord avec statistiques
- Gestion des collaborateurs et missions
- Rapports et analyses
- Interface responsive et moderne
                `
            },
            architecture: {
                title: 'Architecture',
                content: `
## Stack technologique
- **Backend**: Node.js + Express.js
- **Base de données**: PostgreSQL
- **Frontend**: HTML5, CSS3, JavaScript vanilla
- **UI Framework**: Bootstrap 5
- **Graphiques**: Chart.js
- **Icons**: FontAwesome

## Structure du projet
\`\`\`
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
\`\`\`
                `
            },
            api: {
                title: 'API REST',
                content: `
## Endpoints principaux

### Health Check
- \`GET /api/health\` - Statut de l'application

### Time Entries
- \`GET /api/time-entries\` - Liste des saisies
- \`POST /api/time-entries\` - Créer une saisie
- \`GET /api/time-entries/statistics\` - Statistiques
- \`GET /api/time-entries/pending-validation\` - Saisies en attente

### Collaborateurs
- \`GET /api/collaborateurs\` - Liste des collaborateurs

### Missions
- \`GET /api/missions\` - Liste des missions

### Grades
- \`GET /api/grades\` - Liste des grades
- \`GET /api/grades/statistics\` - Statistiques des grades

## Format des réponses
Toutes les réponses sont au format JSON avec la structure suivante :
\`\`\`json
{
  "success": true,
  "data": [...],
  "message": "Message optionnel"
}
\`\`\`
                `
            },
            database: {
                title: 'Base de données',
                content: `
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
                `
            },
            deployment: {
                title: 'Déploiement',
                content: `
## Prérequis
- Node.js 18+
- PostgreSQL 12+
- npm ou yarn

## Installation

1. **Cloner le projet**
\`\`\`bash
git clone <repository-url>
cd TRS-Affichage
\`\`\`

2. **Installer les dépendances**
\`\`\`bash
npm install
\`\`\`

3. **Configuration de la base de données**
\`\`\`bash
# Créer la base de données
createdb trs_affichage

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos paramètres
\`\`\`

4. **Exécuter les migrations**
\`\`\`bash
node scripts/run_migrations.js
\`\`\`

5. **Démarrer le serveur**
\`\`\`bash
npm run dev  # Développement
npm start    # Production
\`\`\`

## Variables d'environnement
- \`DB_HOST\`: Hôte PostgreSQL (défaut: localhost)
- \`DB_PORT\`: Port PostgreSQL (défaut: 5432)
- \`DB_NAME\`: Nom de la base de données (défaut: trs_affichage)
- \`DB_USER\`: Utilisateur PostgreSQL (défaut: postgres)
- \`DB_PASSWORD\`: Mot de passe PostgreSQL
- \`PORT\`: Port du serveur (défaut: 3000)
- \`NODE_ENV\`: Environnement (development/production)
                `
            },
            usage: {
                title: 'Guide d\'utilisation',
                content: `
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
                `
            },
            maintenance: {
                title: 'Maintenance',
                content: `
## Scripts utilitaires

### Tests
\`\`\`bash
# Test de l'API
node scripts/test_api_simple.js

# Test du frontend
node scripts/test_frontend.js

# Test complet du système
node scripts/test_api_comprehensive.js
\`\`\`

### Base de données
\`\`\`bash
# Générer un rapport système
node scripts/generate_system_report.js

# Vérifier l'intégrité des données
node scripts/check_data_integrity.js
\`\`\`

### Sauvegarde
\`\`\`bash
# Sauvegarde de la base de données
pg_dump trs_affichage > backup_$(date +%Y%m%d).sql

# Restauration
psql trs_affichage < backup_20250119.sql
\`\`\`

## Monitoring
- Vérifier les logs du serveur
- Surveiller l'espace disque
- Contrôler les performances de la base de données
- Tester régulièrement les sauvegardes
                `
            }
        }
    };
    
    // Générer le fichier de documentation
    let markdown = `# ${docs.title}\n\n`;
    markdown += `**Version:** ${docs.version}\n`;
    markdown += `**Date:** ${new Date(docs.date).toLocaleDateString('fr-FR')}\n\n`;
    
    Object.entries(docs.sections).forEach(([key, section]) => {
        markdown += `## ${section.title}\n\n`;
        markdown += section.content + '\n\n';
    });
    
    // Ajouter un sommaire
    const toc = Object.entries(docs.sections).map(([key, section]) => {
        return `- [${section.title}](#${section.title.toLowerCase().replace(/\s+/g, '-')})`;
    }).join('\n');
    
    markdown = markdown.replace('## Vue d\'ensemble', `## Sommaire\n\n${toc}\n\n## Vue d'ensemble`);
    
    fs.writeFileSync(path.join(__dirname, '../DOCUMENTATION.md'), markdown);
    log('   ✅ Documentation générée: DOCUMENTATION.md', 'green');
}

async function createDeploymentPackage() {
    log('\n📦 Création du package de déploiement...', 'cyan');
    
    const packageJson = {
        name: 'trs-dashboard',
        version: '2.0.0',
        description: 'Dashboard TRS - Gestion des temps de travail',
        main: 'server.js',
        scripts: {
            start: 'node server.js',
            dev: 'nodemon server.js',
            test: 'node scripts/test_api_simple.js',
            'test:comprehensive': 'node scripts/test_api_comprehensive.js',
            'test:frontend': 'node scripts/test_frontend.js',
            'generate:report': 'node scripts/generate_system_report.js',
            'deploy': 'node scripts/deploy_and_document.js'
        },
        dependencies: {
            express: '^4.18.2',
            pg: '^8.11.3',
            cors: '^2.8.5',
            helmet: '^7.1.0',
            compression: '^1.7.4',
            morgan: '^1.10.0',
            'express-rate-limit': '^7.1.5',
            dotenv: '^16.3.1',
            uuid: '^9.0.1'
        },
        devDependencies: {
            nodemon: '^3.0.2',
            axios: '^1.6.2',
            puppeteer: '^21.6.1'
        },
        engines: {
            node: '>=18.0.0'
        },
        keywords: ['trs', 'dashboard', 'time-management', 'postgresql', 'express'],
        author: 'TRS Team',
        license: 'MIT'
    };
    
    fs.writeFileSync(path.join(__dirname, '../package.json'), JSON.stringify(packageJson, null, 2));
    log('   ✅ package.json mis à jour', 'green');
    
    // Créer un fichier README pour le déploiement
    const readme = `# TRS Dashboard

Application de gestion des temps de travail avec interface moderne et API REST.

## Installation rapide

\`\`\`bash
npm install
npm run dev
\`\`\`

Accédez à http://localhost:3000/dashboard.html

## Documentation complète

Consultez [DOCUMENTATION.md](./DOCUMENTATION.md) pour plus de détails.

## Tests

\`\`\`bash
npm test                    # Test API basique
npm run test:comprehensive  # Test complet
npm run test:frontend       # Test interface
\`\`\`

## Support

Pour toute question ou problème, consultez la documentation ou contactez l'équipe de développement.
`;
    
    fs.writeFileSync(path.join(__dirname, '../README.md'), readme);
    log('   ✅ README.md mis à jour', 'green');
}

async function generateEnvironmentTemplate() {
    log('\n⚙️ Génération du template d\'environnement...', 'cyan');
    
    const envTemplate = `# Configuration de l'environnement TRS Dashboard

# Base de données PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trs_affichage
DB_USER=postgres
DB_PASSWORD=your_password_here

# Serveur
PORT=3000
NODE_ENV=development

# Sécurité
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logs
LOG_LEVEL=info

# CORS (pour la production)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# JWT (pour l'authentification future)
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h
`;
    
    fs.writeFileSync(path.join(__dirname, '../.env.example'), envTemplate);
    log('   ✅ .env.example généré', 'green');
}

async function createDockerFiles() {
    log('\n🐳 Création des fichiers Docker...', 'cyan');
    
    // Dockerfile
    const dockerfile = `FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY . .

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Changer les permissions
RUN chown -R nodejs:nodejs /app
USER nodejs

# Exposer le port
EXPOSE 3000

# Commande de démarrage
CMD ["npm", "start"]
`;
    
    fs.writeFileSync(path.join(__dirname, '../Dockerfile'), dockerfile);
    log('   ✅ Dockerfile créé', 'green');
    
    // docker-compose.yml
    const dockerCompose = `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=trs_affichage
      - DB_USER=postgres
      - DB_PASSWORD=postgres
      - NODE_ENV=production
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=trs_affichage
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

volumes:
  postgres_data:
`;
    
    fs.writeFileSync(path.join(__dirname, '../docker-compose.yml'), dockerCompose);
    log('   ✅ docker-compose.yml créé', 'green');
}

async function runFinalTests() {
    log('\n🧪 Exécution des tests finaux...', 'cyan');
    
    try {
        // Test de l'API
        log('   🔌 Test de l\'API...', 'yellow');
        execSync('node scripts/test_api_simple.js', { stdio: 'inherit' });
        
        // Test du système
        log('   📊 Test du système...', 'yellow');
        execSync('node scripts/generate_system_report.js', { stdio: 'inherit' });
        
        log('   ✅ Tous les tests sont passés', 'green');
    } catch (error) {
        log(`   ⚠️ Certains tests ont échoué: ${error.message}`, 'yellow');
    }
}

async function main() {
    log('🚀 Déploiement et documentation du projet TRS...', 'bright');
    log('==================================================', 'bright');
    
    try {
        await generateDocumentation();
        await createDeploymentPackage();
        await generateEnvironmentTemplate();
        await createDockerFiles();
        await runFinalTests();
        
        log('\n🎉 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !', 'bright');
        log('==================================================', 'bright');
        
        log('\n📋 Récapitulatif des fichiers créés :', 'cyan');
        log('   ✅ DOCUMENTATION.md - Documentation complète', 'green');
        log('   ✅ README.md - Guide d\'installation rapide', 'green');
        log('   ✅ package.json - Configuration du projet', 'green');
        log('   ✅ .env.example - Template de configuration', 'green');
        log('   ✅ Dockerfile - Configuration Docker', 'green');
        log('   ✅ docker-compose.yml - Orchestration Docker', 'green');
        
        log('\n🎯 Prochaines étapes :', 'cyan');
        log('   1. Configurer les variables d\'environnement', 'blue');
        log('   2. Démarrer l\'application avec npm run dev', 'blue');
        log('   3. Accéder à http://localhost:3000/dashboard.html', 'blue');
        log('   4. Consulter la documentation pour plus de détails', 'blue');
        
        log('\n🔧 Commandes utiles :', 'cyan');
        log('   npm run dev              # Développement', 'blue');
        log('   npm start                # Production', 'blue');
        log('   npm test                 # Tests API', 'blue');
        log('   npm run test:frontend    # Tests interface', 'blue');
        log('   npm run generate:report  # Rapport système', 'blue');
        
        log('\n🐳 Déploiement Docker :', 'cyan');
        log('   docker-compose up -d     # Démarrage avec Docker', 'blue');
        log('   docker-compose down      # Arrêt des services', 'blue');
        
    } catch (error) {
        log(`❌ Erreur lors du déploiement: ${error.message}`, 'red');
        process.exit(1);
    }
}

// Gestion des erreurs
process.on('unhandledRejection', (reason, promise) => {
    log(`❌ Promesse rejetée non gérée: ${reason}`, 'red');
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    log(`❌ Erreur non capturée: ${error.message}`, 'red');
    process.exit(1);
});

main().catch(error => {
    log(`❌ Erreur lors de l'exécution: ${error.message}`, 'red');
    process.exit(1);
}); 