// Test rapide de l'endpoint team analytics
const fetch = require('node-fetch');

async function testTeamEndpoint() {
    try {
        // Remplacez par un vrai token
        const token = 'YOUR_TOKEN_HERE';

        const response = await fetch('http://localhost:3000/api/analytics/team/available', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Response:', text);

    } catch (error) {
        console.error('Error:', error);
    }
}

testTeamEndpoint();
