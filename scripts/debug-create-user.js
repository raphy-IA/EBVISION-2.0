const axios = require('axios');

async function debugCreateUser() {
    try {
        console.log('🔍 Debug de création d\'utilisateur...');
        
        // 1. Connexion pour obtenir un token
        console.log('\n1. Connexion pour obtenir un token:');
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'admin@trs.com',
            password: 'admin123'
        });
        
        console.log('✅ Connexion réussie');
        const token = loginResponse.data.data.token;
        
        // 2. Test simple de création d'utilisateur
        console.log('\n2. Test de création d\'utilisateur simple:');
        const newUser = {
            nom: 'Debug',
            prenom: 'Test',
            email: 'debug.test@trs.com',
            password: 'Debug123!',
            initiales: 'DT',
            grade: 'ASSISTANT'
        };
        
        try {
            const createResponse = await axios.post('http://localhost:3000/api/users', newUser, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('✅ Utilisateur créé avec succès');
            console.log('📊 Données utilisateur:', JSON.stringify(createResponse.data.data, null, 2));
            
        } catch (error) {
            console.log('❌ Erreur création utilisateur:');
            console.log('Status:', error.response?.status);
            console.log('Message:', error.response?.data?.message);
            console.log('Détails complets:', JSON.stringify(error.response?.data, null, 2));
            
            // Afficher la stack trace si disponible
            if (error.response?.data?.error) {
                console.log('Stack trace:', error.response.data.error);
            }
        }

    } catch (error) {
        console.error('❌ Erreur générale:', error.message);
        if (error.response) {
            console.log('Response data:', error.response.data);
        }
    }
}

debugCreateUser(); 