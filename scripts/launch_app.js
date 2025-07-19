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

async function launchApp() {
    log('🚀 Lancement de l\'application TRS...', 'bright');
    log('==================================================', 'bright');
    
    const baseUrl = 'http://localhost:3000';
    const dashboardUrl = `${baseUrl}/dashboard.html`;
    const apiUrl = `${baseUrl}/api/health`;
    
    try {
        // Attendre que le serveur soit prêt
        log('\n⏳ Attente du démarrage du serveur...', 'cyan');
        await waitForServer(apiUrl);
        
        // Afficher les informations de connexion
        log('\n📊 Informations de l\'application:', 'cyan');
        log(`   🌐 URL principale: ${baseUrl}`, 'blue');
        log(`   📊 Dashboard: ${dashboardUrl}`, 'blue');
        log(`   🔌 API Health: ${apiUrl}`, 'blue');
        
        // Ouvrir le navigateur
        log('\n🌐 Ouverture du navigateur...', 'cyan');
        openBrowser(dashboardUrl);
        
        // Afficher les instructions
        log('\n📋 Instructions d\'utilisation:', 'cyan');
        log('   1. Le dashboard s\'ouvre automatiquement', 'blue');
        log('   2. Naviguez dans le menu de gauche', 'blue');
        log('   3. Consultez les statistiques', 'blue');
        log('   4. Testez les graphiques', 'blue');
        log('   5. Ouvrez les modales', 'blue');
        
        // Afficher les endpoints disponibles
        log('\n🔌 Endpoints API disponibles:', 'cyan');
        log('   GET  /api/health', 'blue');
        log('   GET  /api/time-entries', 'blue');
        log('   GET  /api/grades', 'blue');
        log('   GET  /api/collaborateurs', 'blue');
        log('   GET  /api/missions', 'blue');
        log('   GET  /api/clients', 'blue');
        log('   GET  /api/divisions', 'blue');
        
        // Afficher les raccourcis
        log('\n⚡ Raccourcis utiles:', 'cyan');
        log('   Ctrl+C : Arrêter le serveur', 'blue');
        log('   F5 : Recharger la page', 'blue');
        log('   F12 : Outils de développement', 'blue');
        
        log('\n✅ Application prête !', 'green');
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

launchApp().catch(error => {
    log(`❌ Erreur lors du lancement: ${error.message}`, 'red');
    process.exit(1);
}); 