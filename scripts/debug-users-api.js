const axios = require('axios');

async function debugUsersAPI() {
    try {
        console.log('🔍 Débogage de l\'API users...');
        
        // 1. Vérifier si le serveur répond
        console.log('\n1. Test de connexion au serveur:');
        try {
            const response = await axios.get('http://localhost:3000/');
            console.log('✅ Serveur accessible:', response.status);
        } catch (error) {
            console.log('❌ Serveur inaccessible:', error.message);
            return;
        }

        // 2. Test de l'API users sans authentification
        console.log('\n2. Test de l\'API users sans authentification:');
        try {
            const response = await axios.get('http://localhost:3000/api/users');
            console.log('✅ Réponse:', response.status);
            console.log('📊 Données:', JSON.stringify(response.data, null, 2));
        } catch (error) {
            console.log('❌ Erreur:', error.response?.status, error.response?.data?.message || error.message);
        }

        // 3. Test avec un token simple
        console.log('\n3. Test avec token simple:');
        try {
            const response = await axios.get('http://localhost:3000/api/users', {
                headers: {
                    'Authorization': 'Bearer simple-token',
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ Réponse:', response.status);
            console.log('📊 Données:', JSON.stringify(response.data, null, 2));
        } catch (error) {
            console.log('❌ Erreur:', error.response?.status, error.response?.data?.message || error.message);
        }

        // 4. Test d'autres endpoints
        console.log('\n4. Test d\'autres endpoints:');
        const endpoints = [
            '/api/collaborateurs',
            '/api/clients',
            '/api/opportunities'
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await axios.get(`http://localhost:3000${endpoint}`);
                console.log(`✅ ${endpoint}:`, response.status);
            } catch (error) {
                console.log(`❌ ${endpoint}:`, error.response?.status, error.response?.data?.message || error.message);
            }
        }

    } catch (error) {
        console.error('❌ Erreur générale:', error.message);
    }
}

debugUsersAPI(); 