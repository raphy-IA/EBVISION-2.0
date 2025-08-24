const http = require('http');

function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: headers
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonBody = JSON.parse(body);
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: jsonBody
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function debugModalCompanies() {
    try {
        console.log('🔍 DÉBOGAGE DU MODAL DES ENTREPRISES');
        console.log('====================================\n');

        // 1. Se connecter avec Alyssa Molom
        console.log('1️⃣ Connexion avec Alyssa Molom...');
        const loginResponse = await makeRequest('POST', '/api/auth/login', {
            email: 'amolom@eb-partnersgroup.cm',
            password: 'Password@2020'
        });

        if (loginResponse.status !== 200) {
            console.log('❌ Erreur de connexion:', loginResponse.status);
            return;
        }

        const token = loginResponse.body.data.token;
        console.log('✅ Connexion réussie avec Alyssa Molom');

        // 2. Récupérer les validations
        console.log('\n2️⃣ Récupération des validations...');
        const validationsResponse = await makeRequest('GET', '/api/prospecting/validations', null, token);
        
        if (validationsResponse.status !== 200) {
            console.log('❌ Erreur récupération validations');
            return;
        }

        const validations = validationsResponse.body.data || [];
        if (validations.length === 0) {
            console.log('❌ Aucune validation trouvée');
            return;
        }

        const validation = validations[0];
        const campaignId = validation.campaign_id;
        console.log(`✅ Validation trouvée: ${validation.campaign_name}`);
        console.log(`   - Campaign ID: ${campaignId}`);
        console.log(`   - Validation ID: ${validation.id}`);

        // 3. Simuler l'appel exact du frontend
        console.log('\n3️⃣ Simulation de l\'appel frontend...');
        const companiesResponse = await makeRequest('GET', `/api/prospecting/campaigns/${campaignId}/companies`, null, token);
        
        console.log(`📊 Statut: ${companiesResponse.status}`);
        if (companiesResponse.status === 200) {
            const data = companiesResponse.body;
            console.log(`   - Succès: ${data.success}`);
            console.log(`   - Nombre d'entreprises: ${data.data ? data.data.length : 0}`);
            
            if (data.data && data.data.length > 0) {
                console.log('   - Structure des données:');
                console.log(`     - Premier élément:`, JSON.stringify(data.data[0], null, 2));
            }
        } else {
            console.log('❌ Erreur API entreprises:', companiesResponse.body);
        }

        // 4. Vérifier la structure attendue par le frontend
        console.log('\n4️⃣ ANALYSE DE LA STRUCTURE ATTENDUE');
        console.log('   - Le frontend attend: data.data (array)');
        console.log('   - Chaque entreprise doit avoir:');
        console.log('     * id');
        console.log('     * name');
        console.log('     * industry');
        console.log('     * city');
        console.log('     * email');
        console.log('     * phone');
        console.log('     * status');

        // 5. Suggestions de débogage
        console.log('\n5️⃣ SUGGESTIONS DE DÉBOGAGE');
        console.log('   - Ouvrir la console du navigateur (F12)');
        console.log('   - Aller sur la page de validation');
        console.log('   - Cliquer sur "Traiter la validation"');
        console.log('   - Vérifier les erreurs JavaScript');
        console.log('   - Vérifier les appels réseau dans l\'onglet Network');

        console.log('\n✅ DÉBOGAGE TERMINÉ');

    } catch (error) {
        console.error('❌ Erreur lors du débogage:', error);
    }
}

// Attendre que le serveur démarre
setTimeout(() => {
    debugModalCompanies();
}, 2000);
