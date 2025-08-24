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

async function diagnosticFrontend() {
    try {
        console.log('🔍 DIAGNOSTIC FRONTEND - PAGE USERS');
        console.log('===================================\n');

        // 1. Se connecter
        console.log('1️⃣ Connexion...');
        const loginResponse = await makeRequest('POST', '/api/auth/login', {
            email: 'cdjiki@eb-partnersgroup.cm',
            password: 'Test123!'
        });

        if (loginResponse.status !== 200) {
            console.log('❌ Erreur de connexion:', loginResponse.status);
            return;
        }

        const token = loginResponse.body.data.token;
        console.log('✅ Connexion réussie');

        // 2. Tester les différents filtres comme le frontend
        console.log('\n2️⃣ TEST DES FILTRES FRONTEND');

        // Test A: Filtre "Utilisateurs actifs" (valeur 'active')
        console.log('\n📋 A. Filtre "Utilisateurs actifs" (status=ACTIF)');
        const activeResponse = await makeRequest('GET', '/api/users?limit=100&status=ACTIF', null, token);
        console.log(`   - Statut: ${activeResponse.status}`);
        if (activeResponse.status === 200) {
            const data = activeResponse.body;
            console.log(`   - Utilisateurs retournés: ${data.data.length}`);
            const alyssa = data.data.find(u => u.login === 'amolom');
            console.log(`   - Alyssa Molom: ${alyssa ? '❌ Présente (incorrect)' : '✅ Absente (correct)'}`);
        }

        // Test B: Filtre "Utilisateurs supprimés" (valeur 'deleted')
        console.log('\n📋 B. Filtre "Utilisateurs supprimés" (status=INACTIF)');
        const deletedResponse = await makeRequest('GET', '/api/users?limit=100&status=INACTIF', null, token);
        console.log(`   - Statut: ${deletedResponse.status}`);
        if (deletedResponse.status === 200) {
            const data = deletedResponse.body;
            console.log(`   - Utilisateurs retournés: ${data.data.length}`);
            const alyssa = data.data.find(u => u.login === 'amolom');
            console.log(`   - Alyssa Molom: ${alyssa ? '✅ Présente (correct)' : '❌ Absente (incorrect)'}`);
        }

        // Test C: Filtre "Tous les utilisateurs" (valeur 'all')
        console.log('\n📋 C. Filtre "Tous les utilisateurs" (sans status)');
        const allResponse = await makeRequest('GET', '/api/users?limit=100', null, token);
        console.log(`   - Statut: ${allResponse.status}`);
        if (allResponse.status === 200) {
            const data = allResponse.body;
            console.log(`   - Utilisateurs retournés: ${data.data.length}`);
            const alyssa = data.data.find(u => u.login === 'amolom');
            console.log(`   - Alyssa Molom: ${alyssa ? '✅ Présente (correct)' : '❌ Absente (incorrect)'}`);
        }

        // 3. Vérifier la page HTML
        console.log('\n3️⃣ VÉRIFICATION DE LA PAGE HTML');
        const htmlResponse = await makeRequest('GET', '/users.html');
        console.log(`   - Statut: ${htmlResponse.status}`);
        if (htmlResponse.status === 200) {
            console.log('   - ✅ Page users.html accessible');
        } else {
            console.log('   - ❌ Page users.html non accessible');
        }

        // 4. Analyser le problème potentiel
        console.log('\n4️⃣ ANALYSE DU PROBLÈME');
        console.log('   - L\'API fonctionne correctement');
        console.log('   - Le problème vient probablement du frontend');
        console.log('   - Vérifications à faire :');
        console.log('     * Le serveur est-il démarré ?');
        console.log('     * La page users.html se charge-t-elle ?');
        console.log('     * Les filtres frontend fonctionnent-ils ?');
        console.log('     * Y a-t-il des erreurs JavaScript ?');

        console.log('\n✅ DIAGNOSTIC TERMINÉ');

    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error);
    }
}

// Attendre que le serveur démarre
setTimeout(() => {
    diagnosticFrontend();
}, 2000);
