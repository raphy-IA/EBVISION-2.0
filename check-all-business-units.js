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
                'Authorization': 'Bearer test-token'
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

async function checkAllBusinessUnits() {
    try {
        console.log('🔍 Vérification de toutes les Business Units...\n');
        
        // Récupérer toutes les BU avec une limite élevée
        const response = await makeRequest('/api/business-units?limit=100');
        
        if (response.status === 200 && response.data.success) {
            const businessUnits = response.data.data;
            console.log(`📈 Total Business Units récupérées: ${businessUnits.length}`);
            
            // Séparer les BU actives et inactives
            const activeBUs = businessUnits.filter(bu => bu.statut === 'ACTIF');
            const inactiveBUs = businessUnits.filter(bu => bu.statut === 'INACTIF');
            
            console.log(`\n✅ BU Actives: ${activeBUs.length}`);
            console.log(`❌ BU Inactives: ${inactiveBUs.length}`);
            
            if (activeBUs.length > 0) {
                console.log('\n📋 Business Units Actives:');
                activeBUs.forEach((bu, index) => {
                    console.log(`${index + 1}. ${bu.nom} (${bu.code}) - Divisions: ${bu.divisions_count}`);
                });
            }
            
            if (inactiveBUs.length > 0) {
                console.log('\n⚠️  Business Units Inactives (supprimées):');
                inactiveBUs.forEach((bu, index) => {
                    console.log(`${index + 1}. ${bu.nom} (${bu.code}) - ID: ${bu.id}`);
                    console.log(`   Supprimée le: ${bu.updated_at}`);
                });
            }
            
            // Vérifier s'il y a des BU sans statut
            const noStatusBUs = businessUnits.filter(bu => !bu.statut);
            if (noStatusBUs.length > 0) {
                console.log('\n❓ Business Units sans statut:');
                noStatusBUs.forEach((bu, index) => {
                    console.log(`${index + 1}. ${bu.nom} (${bu.code}) - ID: ${bu.id}`);
                });
            }
            
        } else {
            console.log('❌ Erreur lors de la récupération des Business Units');
            console.log('Réponse:', response.data);
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

// Exécuter la vérification
checkAllBusinessUnits();
