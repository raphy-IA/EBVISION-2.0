const http = require('http');

// Configuration
const hostname = 'localhost';
const port = 3000;

// Test des données d'une feuille spécifique
function testTimeSheetDetails() {
    console.log('🔍 Test des détails d\'une feuille de temps...');
    
    const timeSheetId = '1f66da03-79ef-42a3-aa20-b2cd91d80d0a';
    
    // Test 1: Récupérer les entrées de temps
    console.log('\n📊 Test 1: Récupération des entrées de temps...');
    
    const options1 = {
        hostname: hostname,
        port: port,
        path: `/api/time-entries?time_sheet_id=${timeSheetId}`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer b306cee5-cab6-453a-b753-cdaa54cad0d4', // Token de Raphaël
            'Content-Type': 'application/json'
        }
    };

    const req1 = http.request(options1, (res) => {
        console.log(`📊 Status: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const response = JSON.parse(data);
                console.log('✅ Entrées récupérées:');
                console.log('  - Nombre d\'entrées:', response.data ? response.data.length : 0);
                if (response.data && response.data.length > 0) {
                    console.log('  - Première entrée:', response.data[0]);
                    console.log('  - Types d\'heures trouvés:', [...new Set(response.data.map(e => e.type_heures))]);
                    console.log('  - Exemples d\'heures:');
                    response.data.slice(0, 3).forEach((entry, index) => {
                        console.log(`    ${index + 1}. type: ${entry.type_heures}, heures: ${entry.heures}, date: ${entry.date_saisie}`);
                    });
                }
            } catch (error) {
                console.log('❌ Erreur parsing JSON:', error);
                console.log('📄 Données brutes:', data);
            }
        });
    });

    req1.on('error', (error) => {
        console.error('❌ Erreur de requête:', error);
    });

    req1.end();
}

// Test 2: Récupérer le statut de la feuille
function testTimeSheetStatus() {
    console.log('\n📊 Test 2: Récupération du statut...');
    
    const timeSheetId = '1f66da03-79ef-42a3-aa20-b2cd91d80d0a';
    
    const options2 = {
        hostname: hostname,
        port: port,
        path: `/api/time-sheet-approvals/${timeSheetId}/status`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer b306cee5-cab6-453a-b753-cdaa54cad0d4',
            'Content-Type': 'application/json'
        }
    };

    const req2 = http.request(options2, (res) => {
        console.log(`📊 Status: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const response = JSON.parse(data);
                console.log('✅ Statut récupéré:');
                console.log('  - Données:', response.data);
            } catch (error) {
                console.log('❌ Erreur parsing JSON:', error);
                console.log('📄 Données brutes:', data);
            }
        });
    });

    req2.on('error', (error) => {
        console.error('❌ Erreur de requête:', error);
    });

    req2.end();
}

// Test 3: Vérifier la structure des données
function testDataStructure() {
    console.log('\n🔍 Test 3: Analyse de la structure des données...');
    
    // Simuler les données que nous recevons
    const sampleEntries = [
        {
            id: 'test-1',
            time_sheet_id: '1f66da03-79ef-42a3-aa20-b2cd91d80d0a',
            mission_id: 'f1b5a971-3a94-473d-af5b-7922348d8a1d',
            task_id: '276f8066-0a5c-4e5e-9d34-a7eb76408238',
            internal_activity_id: null,
            type_heures: 'HC',
            heures: 1.0,
            date_saisie: '2025-08-04T00:00:00.000Z',
            status: 'saved'
        }
    ];
    
    console.log('📊 Structure attendue:');
    console.log('  - type_heures: HC/HNC');
    console.log('  - heures: nombre');
    console.log('  - date_saisie: date ISO');
    console.log('  - mission_id/task_id/internal_activity_id: UUIDs');
    
    console.log('\n📊 Exemple d\'entrée:');
    console.log('  -', sampleEntries[0]);
}

// Exécution des tests
console.log('🚀 Tests de débogage pour la validation des feuilles de temps');
console.log('=' .repeat(60));

testDataStructure();
setTimeout(testTimeSheetStatus, 500);
setTimeout(testTimeSheetDetails, 1000);
