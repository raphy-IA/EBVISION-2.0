const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

const API_BASE_URL = 'http://localhost:3000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-2024';

async function debugToken() {
    console.log('🔧 Debug du problème de token...\n');

    try {
        // 1. Login pour obtenir un token
        console.log('1️⃣ Login pour obtenir un token...');
        const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'pierre.bernard@trs.com',
                password: 'test123'
            })
        });

        const loginData = await loginResponse.json();
        console.log('📊 Réponse de login:', loginData);

        if (!loginData.success) {
            console.log('❌ Login échoué:', loginData.message);
            return;
        }

        const token = loginData.data.token;
        console.log('✅ Token obtenu:', token.substring(0, 50) + '...');

        // 2. Décoder le token pour voir son contenu
        console.log('\n2️⃣ Décodage du token...');
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            console.log('✅ Token décodé avec succès:');
            console.log('   ID:', decoded.id);
            console.log('   Email:', decoded.email);
            console.log('   Nom:', decoded.nom);
            console.log('   Prénom:', decoded.prenom);
            console.log('   Grade:', decoded.grade);
            console.log('   Role:', decoded.role);
            console.log('   Permissions:', decoded.permissions);
            console.log('   Exp:', new Date(decoded.exp * 1000));
        } catch (error) {
            console.log('❌ Erreur lors du décodage du token:', error.message);
        }

        // 3. Tester l'accès à une route protégée
        console.log('\n3️⃣ Test d\'accès à une route protégée...');
        const testResponse = await fetch(`${API_BASE_URL}/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const testData = await testResponse.json();
        console.log('📊 Réponse de test:', testData);

        if (testData.success) {
            console.log('✅ Accès réussi à la route protégée');
        } else {
            console.log('❌ Accès échoué:', testData.message);
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

debugToken(); 