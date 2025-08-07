const axios = require('axios');

async function simulateFrontendExact() {
    console.log('🌐 Simulation exacte du comportement frontend...');
    
    // Simuler le localStorage.getItem('authToken') comme dans le frontend
    const authToken = 'test-token'; // Ce que le frontend devrait récupérer
    
    console.log('🔑 Token utilisé par le frontend:', authToken);
    
    try {
        // Test exact comme dans loadSupervisors du frontend
        console.log('\n📋 Test exact de loadSupervisors...');
        const response = await axios.get('http://localhost:3000/api/time-sheet-supervisors/all-supervisors', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        console.log('✅ loadSupervisors réussi');
        console.log('Status:', response.status);
        console.log('Data:', response.data);
        
        // Test exact comme dans loadCollaborateurs du frontend
        console.log('\n👥 Test exact de loadCollaborateurs...');
        const response2 = await axios.get('http://localhost:3000/api/collaborateurs', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        console.log('✅ loadCollaborateurs réussi');
        console.log('Status:', response2.status);
        console.log('Collaborateurs:', response2.data.data.length);
        
        // Test exact comme dans loadSupervisorRelations du frontend
        if (response.data.data.length > 0) {
            const supervisorId = response.data.data[0].id;
            console.log(`\n🔗 Test exact de loadSupervisorRelations pour superviseur ${supervisorId}...`);
            
            const response3 = await axios.get(`http://localhost:3000/api/time-sheet-supervisors/supervisor/${supervisorId}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            console.log('✅ loadSupervisorRelations réussi');
            console.log('Status:', response3.status);
            console.log('Relations:', response3.data.data.length);
        }
        
        console.log('\n✅ Tous les tests frontend réussis !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la simulation frontend exacte:');
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data);
        console.error('Message:', error.message);
        
        // Test avec différents tokens pour voir si c'est un problème de token
        console.log('\n🔍 Test avec différents tokens...');
        const testTokens = ['test-token', 'authToken', 'token', 'jwt'];
        
        for (const token of testTokens) {
            try {
                const testResponse = await axios.get('http://localhost:3000/api/time-sheet-supervisors/all-supervisors', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                console.log(`✅ Token "${token}" fonctionne`);
            } catch (testError) {
                console.log(`❌ Token "${token}" ne fonctionne pas: ${testError.response?.status}`);
            }
        }
    }
}

simulateFrontendExact(); 