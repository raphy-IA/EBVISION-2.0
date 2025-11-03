#!/usr/bin/env node

/**
 * Script pour vérifier les logs du serveur
 * Usage: node scripts/check-server-logs.js
 */

const http = require('http');

console.log('🔍 VÉRIFICATION DES LOGS DU SERVEUR');
console.log('===================================\n');

function checkServerLogs() {
    console.log('🔄 Test de l\'API pour déclencher les logs...');
    
    const options = {
        hostname: '127.0.0.1',
        port: 3000,
        path: '/api/users/roles',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
        }
    };

    const req = http.request(options, (res) => {
        console.log(`📡 Status: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('📊 Réponse:', data);
            console.log('\n💡 Vérifiez maintenant les logs du serveur dans le terminal où npm start a été lancé');
            console.log('💡 Vous devriez voir des messages de débogage commençant par 🔄, 📊, etc.');
        });
    });

    req.on('error', (err) => {
        console.log('❌ Erreur de connexion:', err.message);
    });

    req.setTimeout(5000, () => {
        console.log('⏰ Timeout');
        req.destroy();
    });

    req.end();
}

checkServerLogs();










