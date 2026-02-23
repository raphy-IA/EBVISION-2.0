const axios = require('axios');

async function verifyDistributedValue() {
    try {
        // En supposant que le serveur tourne sur le port 3000
        const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'admin@eblink.ci',
            password: 'password123'
        });
        const token = loginRes.data.token;

        // Récupérer une année fiscale
        const fyRes = await axios.get('http://localhost:3000/api/fiscal-years', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const fyId = fyRes.data[0].id;

        // Récupérer les objectifs
        const objRes = await axios.get(`http://localhost:3000/api/objectives/all/${fyId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const objectives = objRes.data;
        console.log(`Total objectives found: ${objectives.length}`);

        const withDistributed = objectives.filter(o => o.distributed_value !== undefined);
        console.log(`Objectives with distributed_value: ${withDistributed.length}`);

        withDistributed.forEach(o => {
            console.log(`[${o.scope}] ${o.title}: Target=${o.target_value}, Distributed=${o.distributed_value}`);
        });

    } catch (error) {
        console.error('Verification failed:', error.message);
        if (error.response) console.error(error.response.data);
    }
}

verifyDistributedValue();
