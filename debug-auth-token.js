const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

async function debugAuthToken() {
    try {
        console.log('🔍 Diagnostic du problème d\'authentification...\n');
        
        // 1. Se connecter et récupérer le token
        console.log('1️⃣ Connexion et récupération du token...');
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin.test@trs.com',
                password: 'AdminTest123!'
            })
        });
        
        if (!loginResponse.ok) {
            console.log('❌ Erreur de connexion:', loginResponse.status);
            const errorData = await loginResponse.text();
            console.log('Détails:', errorData);
            return;
        }
        
        const loginData = await loginResponse.json();
        const token = loginData.token;
        console.log('✅ Connexion réussie');
        console.log('📋 Données de connexion:', loginData);
        
        // 2. Décoder le token pour voir son contenu
        console.log('\n2️⃣ Décodage du token...');
        try {
            const decoded = jwt.decode(token);
            console.log('📄 Token décodé:', JSON.stringify(decoded, null, 2));
            
            // Vérifier la date d'expiration
            if (decoded.exp) {
                const expDate = new Date(decoded.exp * 1000);
                const now = new Date();
                console.log(`⏰ Expiration du token: ${expDate}`);
                console.log(`⏰ Date actuelle: ${now}`);
                console.log(`⏰ Token expiré: ${now > expDate}`);
            }
        } catch (error) {
            console.log('❌ Erreur lors du décodage du token:', error.message);
        }
        
        // 3. Tester une requête simple avec le token
        console.log('\n3️⃣ Test de requête simple...');
        const testResponse = await fetch('http://localhost:3000/api/users?limit=1', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`📊 Statut de la réponse: ${testResponse.status}`);
        
        if (testResponse.ok) {
            const testData = await testResponse.json();
            console.log('✅ Requête réussie:', testData.success);
        } else {
            const errorData = await testResponse.text();
            console.log('❌ Erreur de requête:');
            console.log('Statut:', testResponse.status);
            console.log('Détails:', errorData);
        }
        
        // 4. Tester avec un token manuel
        console.log('\n4️⃣ Test avec un token manuel...');
        const manualToken = jwt.sign(
            {
                id: 'f948068f-6d25-4a7a-baf7-567aaae24a8f',
                email: 'admin.test@trs.com',
                nom: 'Admin',
                prenom: 'Test',
                role: 'ADMIN'
            },
            'dev-secret-key-2024',
            { expiresIn: '24h' }
        );
        
        console.log('🔧 Token manuel créé');
        
        const manualResponse = await fetch('http://localhost:3000/api/users?limit=1', {
            headers: {
                'Authorization': `Bearer ${manualToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`📊 Statut de la réponse (token manuel): ${manualResponse.status}`);
        
        if (manualResponse.ok) {
            const manualData = await manualResponse.json();
            console.log('✅ Requête avec token manuel réussie:', manualData.success);
        } else {
            const errorData = await manualResponse.text();
            console.log('❌ Erreur avec token manuel:');
            console.log('Statut:', manualResponse.status);
            console.log('Détails:', errorData);
        }
        
        console.log('\n✅ Diagnostic terminé !');
        
    } catch (error) {
        console.error('❌ Erreur générale:', error);
    }
}

// Attendre que le serveur démarre
setTimeout(() => {
    debugAuthToken();
}, 1000); 