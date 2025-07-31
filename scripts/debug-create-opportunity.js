require('dotenv').config();
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3000/api';

async function debugCreateOpportunity() {
    console.log('🔍 Debug de création d\'opportunité...\n');

    try {
        // Test 1: Vérifier que le serveur répond
        console.log('📡 Test 1: Vérification de la connectivité...');
        const healthResponse = await fetch(`${API_BASE_URL}/opportunities`);
        console.log(`✅ Serveur accessible, statut: ${healthResponse.status}`);

        // Test 2: Vérifier l'authentification
        console.log('\n🔐 Test 2: Test d\'authentification...');
        const authResponse = await fetch(`${API_BASE_URL}/opportunities`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer invalid-token'
            },
            body: JSON.stringify({ nom: 'test' })
        });
        console.log(`📊 Statut sans token valide: ${authResponse.status}`);

        // Test 3: Test avec token de test
        console.log('\n🔐 Test 3: Test avec token de test...');
        const testResponse = await fetch(`${API_BASE_URL}/opportunities`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token'
            },
            body: JSON.stringify({ nom: 'test' })
        });
        console.log(`📊 Statut avec token de test: ${testResponse.status}`);
        
        if (!testResponse.ok) {
            const errorData = await testResponse.json();
            console.log('❌ Erreur détaillée:', JSON.stringify(errorData, null, 2));
        }

        // Test 4: Test avec données complètes
        console.log('\n📋 Test 4: Test avec données complètes...');
        const opportunityData = {
            nom: 'Test Debug Opportunité',
            client_id: '04985c0f-13ea-46ef-9f89-016ad6fad3f0',
            collaborateur_id: 'f9121a6b-89d5-4efd-a8ee-a5c9a8548210',
            business_unit_id: '9242a91e-d917-4da7-bce5-0703125129d8',
            type_opportunite: '420f2a17-687b-499c-bda5-686bdb882697',
            statut: 'EN_COURS',
            source: 'REFERRAL',
            probabilite: 75,
            montant_estime: 50000,
            devise: 'EUR',
            date_fermeture_prevue: '2024-12-31',
            description: 'Test de debug'
        };

        const fullResponse = await fetch(`${API_BASE_URL}/opportunities`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token'
            },
            body: JSON.stringify(opportunityData)
        });

        console.log(`📊 Statut avec données complètes: ${fullResponse.status}`);
        
        if (fullResponse.ok) {
            const successData = await fullResponse.json();
            console.log('✅ Succès:', JSON.stringify(successData, null, 2));
        } else {
            const errorData = await fullResponse.json();
            console.log('❌ Erreur complète:', JSON.stringify(errorData, null, 2));
        }

    } catch (error) {
        console.error('❌ Erreur de connexion:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

debugCreateOpportunity(); 