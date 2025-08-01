const fetch = require('node-fetch');

async function debugAuth() {
    try {
        console.log('🔐 Débogage de l\'authentification...\n');
        
        // 1. Se connecter pour obtenir un token
        console.log('1️⃣ Connexion...');
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'test@trs.com',
                password: 'Test123!'
            })
        });
        
        if (!loginResponse.ok) {
            console.log('❌ Erreur de connexion:', loginResponse.status);
            const errorText = await loginResponse.text();
            console.log('Détails:', errorText);
            return;
        }
        
        const loginData = await loginResponse.json();
        console.log('✅ Connexion réussie');
        console.log('Réponse complète:', JSON.stringify(loginData, null, 2));
        
        const token = loginData.token || loginData.data?.token;
        if (!token) {
            console.log('❌ Token non trouvé dans la réponse');
            return;
        }
        console.log('Token:', token.substring(0, 50) + '...');
        
        // 2. Test API opportunités gagnées avec debug
        console.log('\n2️⃣ Test API opportunités gagnées:');
        const opportunitiesResponse = await fetch('http://localhost:3000/api/opportunities/won-for-mission', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Status:', opportunitiesResponse.status);
        console.log('Status Text:', opportunitiesResponse.statusText);
        
        if (opportunitiesResponse.ok) {
            const opportunitiesData = await opportunitiesResponse.json();
            console.log('✅ Opportunités gagnées:', opportunitiesData.data.opportunities.length, 'opportunités trouvées');
        } else {
            const errorText = await opportunitiesResponse.text();
            console.log('❌ Erreur opportunités:', errorText);
        }
        
    } catch (error) {
        console.error('❌ Erreur générale:', error);
    }
}

debugAuth(); 