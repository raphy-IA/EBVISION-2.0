#!/usr/bin/env node

/**
 * Script simple pour tester l'API /api/users/roles
 * Usage: node scripts/test-api-simple.js
 */

const http = require('http');

console.log('🧪 TEST SIMPLE DE L\'API /api/users/roles');
console.log('==========================================\n');

function testAPI() {
    console.log('🔄 Test de l\'API...');
    
    const options = {
        hostname: '127.0.0.1',
        port: 3000,
        path: '/api/users/roles',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const req = http.request(options, (res) => {
        console.log(`📡 Status: ${res.statusCode}`);
        console.log(`📋 Headers:`, res.headers);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('📊 Réponse complète:');
            try {
                const jsonData = JSON.parse(data);
                console.log(JSON.stringify(jsonData, null, 2));
                
                if (res.statusCode === 200) {
                    console.log('\n✅ API fonctionne correctement!');
                    if (jsonData.success && jsonData.data) {
                        console.log(`✅ ${jsonData.data.length} rôles disponibles`);
                    }
                } else {
                    console.log('\n❌ API retourne une erreur');
                }
            } catch (error) {
                console.log('❌ Erreur de parsing JSON:', error.message);
                console.log('📄 Réponse brute:', data);
            }
        });
    });

    req.on('error', (err) => {
        console.log('❌ Erreur de connexion:', err.message);
        console.log('💡 Vérifiez que le serveur est démarré sur le port 3000');
    });

    req.setTimeout(5000, () => {
        console.log('⏰ Timeout - Le serveur ne répond pas');
        req.destroy();
    });

    req.end();
}

testAPI();

