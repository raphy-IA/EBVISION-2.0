const http = require('http');

// Configuration pour tester l'API en production
const API_BASE = 'https://ebvision2.0.eb-partnersgroup.cm';

// Fonction pour faire une requête HTTP
function makeRequest(path, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'ebvision2.0.eb-partnersgroup.cm',
            port: 443,
            path: path,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        status: res.statusCode,
                        data: jsonData
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: data
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

async function testSecteursAPI() {
    console.log('🔍 Test de l\'API secteurs d\'activité...\n');

    try {
        // Test 1: Vérifier l'endpoint form-data sans token
        console.log('1️⃣ Test sans authentification:');
        const response1 = await makeRequest('/api/clients/form-data');
        console.log(`   Status: ${response1.status}`);
        if (response1.status === 401) {
            console.log('   ✅ Authentification requise (normal)');
        } else {
            console.log('   ⚠️ Réponse inattendue:', response1.data);
        }

        // Test 2: Vérifier l'endpoint avec un token (si disponible)
        console.log('\n2️⃣ Test avec authentification:');
        const token = process.argv[2]; // Token passé en argument
        if (token) {
            const response2 = await makeRequest('/api/clients/form-data', token);
            console.log(`   Status: ${response2.status}`);
            if (response2.status === 200 && response2.data.success) {
                console.log('   ✅ API fonctionne');
                console.log(`   📊 Nombre de secteurs: ${response2.data.data.secteurs?.length || 0}`);
                if (response2.data.data.secteurs?.length > 0) {
                    console.log('   📋 Premier secteur:', response2.data.data.secteurs[0]);
                }
            } else {
                console.log('   ❌ Erreur API:', response2.data);
            }
        } else {
            console.log('   ⚠️ Pas de token fourni (utilisez: node test-secteurs-api.js VOTRE_TOKEN)');
        }

        // Test 3: Vérifier la base de données directement
        console.log('\n3️⃣ Test de la base de données:');
        console.log('   🔍 Vérifiez manuellement dans PostgreSQL:');
        console.log('   SELECT COUNT(*) FROM secteurs_activite WHERE actif = true;');
        console.log('   SELECT * FROM secteurs_activite WHERE actif = true LIMIT 5;');

    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
    }
}

// Exécuter le test
testSecteursAPI();





