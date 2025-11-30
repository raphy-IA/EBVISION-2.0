const http = require('http');

// Votre token d'authentification
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc4NWMzNDFlLTBjM2UtNDI3Yy04ZjMzLTI5NGRkNDBlM2ZjZiIsImVtYWlsIjoicmFwaHlhaTgyQGdtYWlsLmNvbSIsIm5vbSI6InJuZ29zIiwicHJlbm9tIjoiMSIsInJvbGVzIjpbIlNFTklPUl9QQVJUTkVSIl0sInBlcm1pc3Npb25zIjpbInVzZXJzOnJlYWQiLCJ1c2VyczpjcmVhdGUiLCJ1c2Vyczp1cGRhdGUiLCJ1c2VyczpkZWxldGUiXSwiaWF0IjoxNzY0NTIzNzM0LCJleHAiOjE3NjQ2MTAxMzR9.YFZjyi4cs_75tKhQ5ZTXrh7_DwW_H-tUBa5Z11GNf_4';

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/permissions/users/me/permissions',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
};

console.log('🔍 Test de l\'API permissions...\n');

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(`📡 Status: ${res.statusCode}`);
        console.log(`📊 Headers:`, res.headers);
        console.log('\n📦 Response:');

        try {
            const json = JSON.parse(data);
            console.log(JSON.stringify(json, null, 2));

            if (json.permissions) {
                console.log(`\n✅ ${json.permissions.length} permissions trouvées`);
                console.log('Exemple de permission:', json.permissions[0]);
            }
        } catch (e) {
            console.log(data);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Erreur:', error);
});

req.end();
