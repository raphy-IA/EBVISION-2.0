const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function debugUserCreation() {
    console.log('🔍 Débogage de la création d\'utilisateur...\n');

    try {
        // 1. Connexion
        console.log('1. Test de connexion:');
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: 'admin@trs.com',
            password: 'admin123'
        });
        
        if (loginResponse.data.success) {
            console.log('✅ Connexion réussie');
            const token = loginResponse.data.token;
            
            // 2. Test de création d'utilisateur avec email unique
            console.log('\n2. Test de création d\'utilisateur avec email unique:');
            const timestamp = Date.now();
            const newUser = {
                nom: 'Debug',
                prenom: 'Test',
                email: `debug.test.${timestamp}@trs.com`,
                password: 'password123',
                login: `debug${timestamp}`,
                role: 'USER'
            };
            
            console.log('📤 Données envoyées:', JSON.stringify(newUser, null, 2));
            
            const createResponse = await axios.post(`${API_BASE_URL}/users`, newUser, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (createResponse.data.success) {
                console.log('✅ Création d\'utilisateur réussie');
                console.log('📥 Réponse:', JSON.stringify(createResponse.data, null, 2));
            } else {
                console.log('❌ Erreur création utilisateur:');
                console.log(`Status: ${createResponse.status}`);
                console.log(`Message: ${createResponse.data.message || createResponse.data.error}`);
                console.log('📥 Réponse complète:', JSON.stringify(createResponse.data, null, 2));
            }
            
        } else {
            console.log('❌ Échec de connexion');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.response?.data || error.message);
        if (error.response) {
            console.log('📊 Status:', error.response.status);
            console.log('📊 Headers:', error.response.headers);
            console.log('📊 Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

debugUserCreation(); 