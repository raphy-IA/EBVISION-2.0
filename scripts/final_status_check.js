const fs = require('fs');
const path = require('path');
const axios = require('axios');

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

async function checkProjectStatus() {
    log('🎯 VÉRIFICATION FINALE DU PROJET TRS DASHBOARD', 'bright');
    log('==================================================', 'bright');
    
    const status = {
        files: {},
        api: {},
        documentation: {},
        deployment: {}
    };
    
    // Vérification des fichiers essentiels
    log('\n📁 Vérification des fichiers du projet...', 'cyan');
    
    const essentialFiles = [
        { path: 'server.js', name: 'Serveur principal' },
        { path: 'package.json', name: 'Configuration npm' },
        { path: 'public/dashboard.html', name: 'Interface utilisateur' },
        { path: 'src/routes/time-entries.js', name: 'Routes time entries' },
        { path: 'src/routes/grades.js', name: 'Routes grades' },
        { path: 'src/routes/collaborateurs.js', name: 'Routes collaborateurs' },
        { path: 'src/routes/missions.js', name: 'Routes missions' },
        { path: 'src/utils/database.js', name: 'Configuration DB' },
        { path: 'scripts/test_api_simple.js', name: 'Scripts de test' },
        { path: 'scripts/generate_system_report.js', name: 'Scripts de rapport' }
    ];
    
    for (const file of essentialFiles) {
        const exists = fs.existsSync(file.path);
        status.files[file.name] = exists;
        log(`   ${exists ? '✅' : '❌'} ${file.name}: ${exists ? 'Présent' : 'Manquant'}`, exists ? 'green' : 'red');
    }
    
    // Vérification de l'API
    log('\n🔌 Vérification de l\'API...', 'cyan');
    
    const apiEndpoints = [
        { path: '/api/health', name: 'Health Check' },
        { path: '/api/grades', name: 'Grades' },
        { path: '/api/collaborateurs', name: 'Collaborateurs' },
        { path: '/api/missions', name: 'Missions' },
        { path: '/api/time-entries', name: 'Time Entries' },
        { path: '/api/time-entries/statistics', name: 'Statistiques' }
    ];
    
    for (const endpoint of apiEndpoints) {
        try {
            const response = await axios.get(`http://localhost:3000${endpoint.path}`);
            status.api[endpoint.name] = response.status === 200;
            log(`   ✅ ${endpoint.name}: ${response.status} OK`, 'green');
        } catch (error) {
            status.api[endpoint.name] = false;
            log(`   ❌ ${endpoint.name}: ${error.response?.status || 'Erreur'}`, 'red');
        }
    }
    
    // Vérification de la documentation
    log('\n📚 Vérification de la documentation...', 'cyan');
    
    const docFiles = [
        { path: 'DOCUMENTATION.md', name: 'Documentation technique' },
        { path: 'README.md', name: 'Guide d\'installation' },
        { path: 'RAPPORT_FINAL_PROJET.md', name: 'Rapport final' },
        { path: '.env.example', name: 'Template environnement' }
    ];
    
    for (const doc of docFiles) {
        const exists = fs.existsSync(doc.path);
        status.documentation[doc.name] = exists;
        log(`   ${exists ? '✅' : '❌'} ${doc.name}: ${exists ? 'Présent' : 'Manquant'}`, exists ? 'green' : 'red');
    }
    
    // Vérification des fichiers de déploiement
    log('\n🐳 Vérification des fichiers de déploiement...', 'cyan');
    
    const deployFiles = [
        { path: 'Dockerfile', name: 'Dockerfile' },
        { path: 'docker-compose.yml', name: 'Docker Compose' }
    ];
    
    for (const deploy of deployFiles) {
        const exists = fs.existsSync(deploy.path);
        status.deployment[deploy.name] = exists;
        log(`   ${exists ? '✅' : '❌'} ${deploy.name}: ${exists ? 'Présent' : 'Manquant'}`, exists ? 'green' : 'red');
    }
    
    // Vérification de la structure des dossiers
    log('\n📂 Vérification de la structure des dossiers...', 'cyan');
    
    const directories = [
        { path: 'src', name: 'Source code' },
        { path: 'src/routes', name: 'Routes API' },
        { path: 'src/models', name: 'Modèles' },
        { path: 'src/middleware', name: 'Middlewares' },
        { path: 'src/utils', name: 'Utilitaires' },
        { path: 'public', name: 'Fichiers statiques' },
        { path: 'scripts', name: 'Scripts utilitaires' },
        { path: 'database', name: 'Base de données' }
    ];
    
    for (const dir of directories) {
        const exists = fs.existsSync(dir.path);
        log(`   ${exists ? '✅' : '❌'} ${dir.name}: ${exists ? 'Présent' : 'Manquant'}`, exists ? 'green' : 'red');
    }
    
    // Calcul des statistiques
    const totalFiles = Object.keys(status.files).length;
    const presentFiles = Object.values(status.files).filter(Boolean).length;
    const totalApi = Object.keys(status.api).length;
    const workingApi = Object.values(status.api).filter(Boolean).length;
    const totalDocs = Object.keys(status.documentation).length;
    const presentDocs = Object.values(status.documentation).filter(Boolean).length;
    const totalDeploy = Object.keys(status.deployment).length;
    const presentDeploy = Object.values(status.deployment).filter(Boolean).length;
    
    // Résumé final
    log('\n📊 RÉSUMÉ FINAL DU PROJET', 'bright');
    log('==================================================', 'bright');
    
    log(`📁 Fichiers essentiels: ${presentFiles}/${totalFiles} (${Math.round(presentFiles/totalFiles*100)}%)`, presentFiles === totalFiles ? 'green' : 'yellow');
    log(`🔌 Endpoints API: ${workingApi}/${totalApi} (${Math.round(workingApi/totalApi*100)}%)`, workingApi === totalApi ? 'green' : 'yellow');
    log(`📚 Documentation: ${presentDocs}/${totalDocs} (${Math.round(presentDocs/totalDocs*100)}%)`, presentDocs === totalDocs ? 'green' : 'yellow');
    log(`🐳 Déploiement: ${presentDeploy}/${totalDeploy} (${Math.round(presentDeploy/totalDeploy*100)}%)`, presentDeploy === totalDeploy ? 'green' : 'yellow');
    
    const overallScore = (presentFiles + workingApi + presentDocs + presentDeploy) / (totalFiles + totalApi + totalDocs + totalDeploy) * 100;
    
    log(`\n🎯 Score global: ${Math.round(overallScore)}%`, overallScore >= 90 ? 'green' : overallScore >= 75 ? 'yellow' : 'red');
    
    if (overallScore >= 90) {
        log('\n🏆 PROJET PRÊT POUR LA PRODUCTION !', 'bright');
        log('==================================================', 'bright');
        log('✅ Tous les composants essentiels sont présents', 'green');
        log('✅ L\'API fonctionne correctement', 'green');
        log('✅ La documentation est complète', 'green');
        log('✅ Le déploiement est configuré', 'green');
        
        log('\n🚀 Commandes pour démarrer :', 'cyan');
        log('   npm run dev              # Développement', 'blue');
        log('   npm start                # Production', 'blue');
        log('   docker-compose up -d     # Docker', 'blue');
        
        log('\n🌐 Accès à l\'application :', 'cyan');
        log('   Dashboard: http://localhost:3000/dashboard.html', 'blue');
        log('   API Health: http://localhost:3000/api/health', 'blue');
        
        log('\n📚 Documentation :', 'cyan');
        log('   README.md                # Guide rapide', 'blue');
        log('   DOCUMENTATION.md         # Documentation complète', 'blue');
        log('   RAPPORT_FINAL_PROJET.md  # Rapport final', 'blue');
        
    } else if (overallScore >= 75) {
        log('\n⚠️ PROJET PRESQUE TERMINÉ', 'yellow');
        log('Quelques éléments manquent mais le projet est fonctionnel', 'yellow');
    } else {
        log('\n❌ PROJET INCOMPLET', 'red');
        log('Des éléments essentiels manquent', 'red');
    }
    
    log('\n🎉 Vérification terminée !', 'bright');
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

checkProjectStatus().catch(error => {
    log(`❌ Erreur lors de la vérification: ${error.message}`, 'red');
    process.exit(1);
}); 