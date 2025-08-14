const axios = require('axios');

async function makeRequest(url, token) {
    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error(`❌ Erreur pour ${url}:`, error.response?.data || error.message);
        return null;
    }
}

async function testAlertsAndEncours() {
    try {
        console.log('🔍 Test des endpoints /api/analytics/alerts et /api/analytics/encours-facturation...');
        
        // 1. Login pour obtenir le token
        console.log('\n1️⃣ Login...');
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'admin@eb-vision.com',
            password: 'admin123'
        });
        
        if (!loginResponse.data.success) {
            console.error('❌ Échec du login');
            return;
        }
        
        const token = loginResponse.data.token;
        console.log('✅ Login réussi, token obtenu');
        
        // 2. Test endpoint alerts
        console.log('\n2️⃣ Test /api/analytics/alerts...');
        const alertsResult = await makeRequest('http://localhost:3000/api/analytics/alerts', token);
        if (alertsResult) {
            console.log('✅ Alerts API fonctionne');
            console.log('📊 Données reçues:', JSON.stringify(alertsResult, null, 2));
        }
        
        // 3. Test endpoint encours-facturation
        console.log('\n3️⃣ Test /api/analytics/encours-facturation...');
        const encoursResult = await makeRequest('http://localhost:3000/api/analytics/encours-facturation', token);
        if (encoursResult) {
            console.log('✅ Encours-facturation API fonctionne');
            console.log('📊 Données reçues:', JSON.stringify(encoursResult, null, 2));
        }
        
    } catch (error) {
        console.error('❌ Erreur générale:', error.message);
    }
}

testAlertsAndEncours();


