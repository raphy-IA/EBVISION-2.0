const http = require('http');

// Configuration
const hostname = 'localhost';
const port = 3000;

// Fonction pour faire une requête HTTP
function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: hostname,
            port: port,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token' // Token de test
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            
            res.on('data', (chunk) => {
                body += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    resolve({ status: res.statusCode, data: response });
                } catch (error) {
                    resolve({ status: res.statusCode, data: body });
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

async function checkBusinessUnits() {
    try {
        console.log('🔍 Vérification des Business Units via l\'API...\n');
        
        // Test de connexion au serveur
        console.log('🌐 Test de connexion au serveur...');
        const response = await makeRequest('/api/business-units');
        
        console.log(`📊 Statut de la réponse: ${response.status}`);
        console.log('📋 Données reçues:');
        console.log(JSON.stringify(response.data, null, 2));
        
        if (response.status === 200 && response.data.success) {
            const businessUnits = response.data.data;
            console.log(`\n📈 Total Business Units: ${businessUnits.length}`);
            
            if (businessUnits.length === 0) {
                console.log('❌ Aucune Business Unit trouvée');
            } else {
                console.log('\n📋 Liste des Business Units:');
                businessUnits.forEach((bu, index) => {
                    console.log(`${index + 1}. ${bu.nom} (${bu.code}) - Statut: ${bu.statut || 'N/A'}`);
                });
            }
        } else {
            console.log('❌ Erreur lors de la récupération des Business Units');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        console.log('💡 Assurez-vous que le serveur est démarré sur le port 3000');
    }
}

// Exécuter la vérification
checkBusinessUnits();
