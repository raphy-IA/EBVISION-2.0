#!/usr/bin/env node

/**
 * Script pour tester l'API avec un token valide
 * Usage: node scripts/test-api-with-token.js
 */

const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();

console.log('🧪 TEST DE L\'API AVEC TOKEN VALIDE');
console.log('===================================\n');

function testAPIWithToken() {
    console.log('🔄 Génération d\'un token de test...');
    
    // Créer un token de test avec les mêmes données que l'utilisateur connecté
    const testUser = {
        id: '8eb54916-a0b3-4f9e-acd1-75830271feab',
        nom: 'Administrateur',
        prenom: 'Système',
        email: 'admin@trs.com',
        login: 'admin',
        role: 'SUPER_ADMIN'
    };
    
    const token = jwt.sign(testUser, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('✅ Token généré');
    
    console.log('🔄 Test de l\'API avec token...');
    
    const options = {
        hostname: '127.0.0.1',
        port: 3000,
        path: '/api/users/roles',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    const req = http.request(options, (res) => {
        console.log(`📡 Status: ${res.statusCode}`);
        
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
                    console.log('\n✅ API fonctionne correctement avec token!');
                    if (jsonData.success && jsonData.data) {
                        console.log(`✅ ${jsonData.data.length} rôles disponibles`);
                        console.log('📋 Rôles:');
                        jsonData.data.forEach((role, index) => {
                            console.log(`   ${index + 1}. ${role.name} (${role.id})`);
                        });
                    }
                } else {
                    console.log('\n❌ API retourne une erreur');
                    console.log('💡 Vérifiez les logs du serveur pour plus de détails');
                }
            } catch (error) {
                console.log('❌ Erreur de parsing JSON:', error.message);
                console.log('📄 Réponse brute:', data);
            }
        });
    });

    req.on('error', (err) => {
        console.log('❌ Erreur de connexion:', err.message);
    });

    req.setTimeout(5000, () => {
        console.log('⏰ Timeout - Le serveur ne répond pas');
        req.destroy();
    });

    req.end();
}

testAPIWithToken();










