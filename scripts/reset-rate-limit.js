const fetch = require('node-fetch');

async function resetRateLimit() {
    console.log('🔧 Réinitialisation du rate limiting...\n');

    const baseURL = 'http://localhost:3000';
    let authToken = null;

    try {
        // 1. Login pour obtenir un token
        console.log('1️⃣ Login...');
        const loginResponse = await fetch(`${baseURL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@trs.com',
                password: 'admin123'
            })
        });

        if (!loginResponse.ok) {
            throw new Error(`Login échoué: ${loginResponse.status}`);
        }

        const loginData = await loginResponse.json();
        authToken = loginData.data.token;
        console.log('✅ Login réussi');

        // 2. Test de l'API users avec token
        console.log('\n2️⃣ Test de /api/users avec token...');
        const usersResponse = await fetch(`${baseURL}/api/users`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Status: ${usersResponse.status} ${usersResponse.statusText}`);
        
        if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            console.log('✅ Utilisateurs récupérés avec succès');
            console.log(`   Nombre d'utilisateurs: ${usersData.data?.length || 0}`);
        } else {
            const errorData = await usersResponse.text();
            console.log('❌ Erreur lors de la récupération des utilisateurs');
            console.log('   Erreur:', errorData);
        }

        // 3. Test de plusieurs requêtes pour vérifier le rate limiting
        console.log('\n3️⃣ Test de plusieurs requêtes consécutives...');
        
        for (let i = 1; i <= 5; i++) {
            console.log(`   Requête ${i}/5...`);
            const response = await fetch(`${baseURL}/api/users`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log(`   Status: ${response.status} ${response.statusText}`);
            
            if (response.status === 429) {
                console.log('❌ Rate limiting activé trop tôt');
                break;
            }
            
            // Petit délai entre les requêtes
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('\n✅ Test terminé');

    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
    }
}

// Exécuter le test
resetRateLimit().catch(console.error); 