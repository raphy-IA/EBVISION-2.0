const http = require('http');

// Configuration
const hostname = 'localhost';
const port = 3000;

// Fonction pour faire une requête HTTP
function makeRequest(path, method = 'GET', data = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: hostname,
            port: port,
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

async function getAuthToken() {
    try {
        console.log('🔐 Obtention d\'un token d\'authentification...');
        
        // Utiliser les identifiants d'un utilisateur existant
        const loginData = {
            email: 'amolom@eb-partnersgroup.cm',
            password: 'Password@2020'
        };
        
        const response = await makeRequest('/api/auth/login', 'POST', loginData);
        
        if (response.status === 200 && response.data.success) {
            const token = response.data.data.token;
            console.log('✅ Token obtenu avec succès');
            return token;
        } else {
            console.log('❌ Erreur lors de l\'obtention du token');
            console.log('Réponse:', response.data);
            return null;
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'authentification:', error.message);
        return null;
    }
}

async function restoreBusinessUnitWithAuth() {
    try {
        console.log('🔧 Restauration de la Business Unit avec authentification...\n');
        
        // Obtenir un token d'authentification
        const token = await getAuthToken();
        if (!token) {
            console.log('❌ Impossible d\'obtenir un token d\'authentification');
            return;
        }
        
        // ID de la BU supprimée
        const buId = '6e4b98fc-a29a-4652-8f12-496778fc5197';
        
        // D'abord, vérifier l'état actuel de la BU
        console.log('📋 Vérification de l\'état actuel...');
        const checkResponse = await makeRequest(`/api/business-units/${buId}`, 'GET', null, token);
        
        if (checkResponse.status === 200) {
            console.log('✅ BU trouvée, état actuel:', checkResponse.data.data.statut);
        } else {
            console.log('❌ BU non trouvée ou erreur');
            console.log('Réponse:', checkResponse.data);
            return;
        }
        
        // Restaurer la BU en la remettant à ACTIF
        console.log('🔄 Restauration de la BU...');
        const restoreData = {
            statut: 'ACTIF'
        };
        
        const restoreResponse = await makeRequest(`/api/business-units/${buId}`, 'PUT', restoreData, token);
        
        if (restoreResponse.status === 200 && restoreResponse.data.success) {
            console.log('✅ Business Unit restaurée avec succès !');
            console.log('📋 Détails:', restoreResponse.data.data);
        } else {
            console.log('❌ Erreur lors de la restauration');
            console.log('Réponse:', restoreResponse.data);
        }
        
        // Vérifier le résultat
        console.log('\n🔍 Vérification du résultat...');
        const finalCheck = await makeRequest('/api/business-units?limit=100', 'GET', null, token);
        
        if (finalCheck.status === 200 && finalCheck.data.success) {
            const businessUnits = finalCheck.data.data;
            const activeBUs = businessUnits.filter(bu => bu.statut === 'ACTIF');
            const inactiveBUs = businessUnits.filter(bu => bu.statut === 'INACTIF');
            
            console.log(`📈 Résultat final:`);
            console.log(`   ✅ BU Actives: ${activeBUs.length}`);
            console.log(`   ❌ BU Inactives: ${inactiveBUs.length}`);
            
            // Vérifier si notre BU est maintenant active
            const restoredBU = businessUnits.find(bu => bu.id === buId);
            if (restoredBU && restoredBU.statut === 'ACTIF') {
                console.log(`✅ La BU "${restoredBU.nom}" a été restaurée avec succès !`);
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

// Exécuter la restauration
restoreBusinessUnitWithAuth();
