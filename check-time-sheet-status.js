const http = require('http');

function makeRequest(method, path, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    body: body
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

async function checkTimeSheetStatus() {
    try {
        console.log('🔍 Vérification du statut de la feuille de temps...\n');

        // Token de Cyrille Djiki (à remplacer par un token valide si nécessaire)
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImY2YTY1NjdmLWI1MWQtNGRiYy04NzJkLTEwMDUxNTZiZDE4NyIsImVtYWlsIjoiY2RqaWtpQGViLXBhcnRuZXJzZ3JvdXAuY20iLCJub20iOiJEamlraSIsInByZW5vbSI6IkN5cmlsbGUiLCJyb2xlIjoiTUFOQUdFUiIsInBlcm1pc3Npb25zIjpbInVzZXJzOnJlYWQiLCJ1c2VyczpjcmVhdGUiLCJ1c2Vyczp1cGRhdGUiLCJ1c2VyczpkZWxldGUiXSwiaWF0IjoxNzU0NTc1NDExLCJleHAiOjE3NTQ2NjE4MTF9.4tY4gJBgPoxuAVvBYJG6WCX-JxkYDfICV0GMWsbBWec';

        // 1. Vérifier la feuille de temps actuelle
        console.log('📋 1. Feuille de temps actuelle:');
        const timeSheetResponse = await makeRequest('GET', '/api/time-sheets/current?week_start=2025-08-04', token);
        console.log('📊 Statut:', timeSheetResponse.status);
        console.log('📄 Réponse:', timeSheetResponse.body);

        // 2. Vérifier les entrées de temps
        console.log('\n📋 2. Entrées de temps:');
        const entriesResponse = await makeRequest('GET', '/api/time-entries?user_id=f6a6567f-b51d-4dbc-872d-1005156bd187&week_start=2025-08-04&week_end=2025-08-10', token);
        console.log('📊 Statut:', entriesResponse.status);
        console.log('📄 Réponse:', entriesResponse.body);

        // 3. Vérifier le statut de la feuille de temps spécifique
        console.log('\n📋 3. Statut de la feuille de temps 1f66da03-79ef-42a3-aa20-b2cd91d80d0a:');
        const specificResponse = await makeRequest('GET', '/api/time-sheets/1f66da03-79ef-42a3-aa20-b2cd91d80d0a', token);
        console.log('📊 Statut:', specificResponse.status);
        console.log('📄 Réponse:', specificResponse.body);

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    }
}

checkTimeSheetStatus();
