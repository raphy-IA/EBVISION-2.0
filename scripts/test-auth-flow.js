// Script pour tester le flux d'authentification
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function testAuthFlow() {
    try {
        console.log('🔐 Test du flux d\'authentification...\n');
        
        // 1. Tester la connexion
        console.log('📞 Test de l\'endpoint de connexion...');
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: 'admin@trs.com',
            password: 'admin123'
        });
        
        console.log('🔗 Réponse de connexion:', loginResponse.data);
        
        if (!loginResponse.data.success) {
            console.log('❌ Échec de la connexion');
            return;
        }
        
        const token = loginResponse.data.data.token;
        console.log('✅ Token reçu:', token.substring(0, 50) + '...');
        
        // 2. Tester immédiatement avec le token
        console.log('\n👤 Test d\'accès aux rôles...');
        const rolesResponse = await axios.get(`${API_BASE_URL}/users/roles`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Accès aux rôles réussi:', rolesResponse.data);
        
        // 3. Tester l'accès aux collaborateurs
        console.log('\n👥 Test d\'accès aux collaborateurs...');
        const collaborateursResponse = await axios.get(`${API_BASE_URL}/collaborateurs`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Accès aux collaborateurs réussi. Nombre:', collaborateursResponse.data.data?.length || 0);
        
    } catch (error) {
        console.error('❌ Erreur:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
        });
    }
}

testAuthFlow();
