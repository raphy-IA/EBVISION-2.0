const { exec } = require('child_process');
const http = require('http');

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

function waitForServer(url, maxAttempts = 30) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        
        const checkServer = () => {
            attempts++;
            
            const req = http.get(url, (res) => {
                if (res.statusCode === 200) {
                    log(`✅ Serveur accessible sur ${url}`, 'green');
                    resolve(true);
                } else {
                    if (attempts >= maxAttempts) {
                        reject(new Error(`Serveur non accessible après ${maxAttempts} tentatives`));
                    } else {
                        setTimeout(checkServer, 1000);
                    }
                }
            });
            
            req.on('error', () => {
                if (attempts >= maxAttempts) {
                    reject(new Error(`Serveur non accessible après ${maxAttempts} tentatives`));
                } else {
                    setTimeout(checkServer, 1000);
                }
            });
            
            req.setTimeout(2000, () => {
                req.destroy();
                if (attempts >= maxAttempts) {
                    reject(new Error(`Timeout après ${maxAttempts} tentatives`));
                } else {
                    setTimeout(checkServer, 1000);
                }
            });
        };
        
        checkServer();
    });
}

function openBrowser(url) {
    const platform = process.platform;
    let command;
    
    switch (platform) {
        case 'win32':
            command = `start ${url}`;
            break;
        case 'darwin':
            command = `open ${url}`;
            break;
        default:
            command = `xdg-open ${url}`;
    }
    
    exec(command, (error) => {
        if (error) {
            log(`⚠️ Impossible d'ouvrir automatiquement le navigateur: ${error.message}`, 'yellow');
            log(`🌐 Ouvrez manuellement: ${url}`, 'blue');
        } else {
            log(`🌐 Navigateur ouvert sur ${url}`, 'green');
        }
    });
}

async function launchAllPages() {
    log('🚀 Lancement de toutes les pages TRS...', 'bright');
    log('==================================================', 'bright');
    
    const baseUrl = 'http://localhost:3000';
    const pages = [
        { name: 'Dashboard Principal', url: `${baseUrl}/dashboard.html` },
        { name: 'Gestion des Saisies', url: `${baseUrl}/time-entries.html` },
        { name: 'Validation', url: `${baseUrl}/validation.html` },
        { name: 'Rapports et Analyses', url: `${baseUrl}/reports.html` },
        { name: 'Gestion des Collaborateurs', url: `${baseUrl}/collaborateurs.html` }
    ];
    
    const apiUrl = `${baseUrl}/api/health`;
    
    try {
        // Attendre que le serveur soit prêt
        log('\n⏳ Attente du démarrage du serveur...', 'cyan');
        await waitForServer(apiUrl);
        
        // Afficher les informations de connexion
        log('\n📊 Informations de l\'application:', 'cyan');
        log(`   🌐 URL principale: ${baseUrl}`, 'blue');
        log(`   🔌 API Health: ${apiUrl}`, 'blue');
        
        // Ouvrir toutes les pages
        log('\n🌐 Ouverture de toutes les pages...', 'cyan');
        
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            log(`   📄 ${page.name}: ${page.url}`, 'blue');
            
            // Attendre un peu entre chaque ouverture pour éviter la surcharge
            setTimeout(() => {
                openBrowser(page.url);
            }, i * 1000);
        }
        
        // Afficher les instructions
        log('\n📋 Instructions d\'utilisation:', 'cyan');
        log('   1. Toutes les pages s\'ouvrent automatiquement', 'blue');
        log('   2. Naviguez entre les pages via les liens', 'blue');
        log('   3. Testez toutes les fonctionnalités', 'blue');
        log('   4. Utilisez les formulaires et graphiques', 'blue');
        
        // Afficher les endpoints disponibles
        log('\n🔌 Endpoints API disponibles:', 'cyan');
        log('   GET  /api/health', 'blue');
        log('   GET  /api/time-entries', 'blue');
        log('   GET  /api/grades', 'blue');
        log('   GET  /api/collaborateurs', 'blue');
        log('   GET  /api/missions', 'blue');
        log('   GET  /api/clients', 'blue');
        log('   GET  /api/divisions', 'blue');
        log('   POST /api/time-entries', 'blue');
        log('   PUT  /api/time-entries/:id', 'blue');
        log('   DELETE /api/time-entries/:id', 'blue');
        
        // Afficher les raccourcis
        log('\n⚡ Raccourcis utiles:', 'cyan');
        log('   Ctrl+C : Arrêter le serveur', 'blue');
        log('   F5 : Recharger la page', 'blue');
        log('   F12 : Outils de développement', 'blue');
        log('   Ctrl+Tab : Changer d\'onglet', 'blue');
        
        log('\n✅ Toutes les pages sont prêtes !', 'green');
        log('==================================================', 'bright');
        
    } catch (error) {
        log(`❌ Erreur: ${error.message}`, 'red');
        log('\n🔧 Solutions possibles:', 'yellow');
        log('   1. Vérifiez que le serveur est démarré: npm run dev', 'blue');
        log('   2. Vérifiez le port 3000: netstat -ano | findstr :3000', 'blue');
        log('   3. Tuez les processus: taskkill /PID <PID> /F', 'blue');
        log('   4. Redémarrez: npm run dev', 'blue');
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

launchAllPages().catch(error => {
    log(`❌ Erreur lors du lancement: ${error.message}`, 'red');
    process.exit(1);
}); 