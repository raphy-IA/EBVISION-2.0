const https = require('https');
const http = require('http');

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const timeSheetId = '1f66da03-79ef-42a3-aa20-b2cd91d80d0a';

// Fonction pour faire une requête HTTP
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };
        
        const req = client.request(requestOptions, (res) => {
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
                } catch (error) {
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
        
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        
        req.end();
    });
}

async function checkTimeSheetStatus() {
    try {
        console.log('🔍 Vérification du statut de la feuille de temps via API...\n');
        console.log(`📋 TimeSheet ID: ${timeSheetId}\n`);
        
        // 1. Vérifier la feuille de temps directement
        console.log('1️⃣ Vérification de la feuille de temps...');
        const timeSheetResponse = await makeRequest(`${API_BASE_URL}/time-sheets/${timeSheetId}`);
        
        if (timeSheetResponse.status === 200) {
            console.log('✅ Feuille de temps trouvée:');
            console.log(`  - ID: ${timeSheetResponse.data.id}`);
            console.log(`  - User ID: ${timeSheetResponse.data.user_id}`);
            console.log(`  - Semaine: ${timeSheetResponse.data.week_start} à ${timeSheetResponse.data.week_end}`);
            console.log(`  - Statut: ${timeSheetResponse.data.status}`);
            console.log(`  - Créée le: ${timeSheetResponse.data.created_at}`);
            console.log(`  - Modifiée le: ${timeSheetResponse.data.updated_at}\n`);
        } else {
            console.log(`❌ Erreur ${timeSheetResponse.status}:`, timeSheetResponse.data);
        }
        
        // 2. Vérifier les entrées de temps
        console.log('2️⃣ Vérification des entrées de temps...');
        const entriesResponse = await makeRequest(`${API_BASE_URL}/time-entries?time_sheet_id=${timeSheetId}`);
        
        if (entriesResponse.status === 200) {
            const entries = entriesResponse.data;
            console.log(`✅ ${entries.length} entrées trouvées`);
            
            const hcEntries = entries.filter(e => e.type_heures === 'HC');
            const hncEntries = entries.filter(e => e.type_heures === 'HNC');
            const totalHours = entries.reduce((sum, e) => sum + (parseFloat(e.heures) || 0), 0);
            
            console.log(`  - HC: ${hcEntries.length} entrées`);
            console.log(`  - HNC: ${hncEntries.length} entrées`);
            console.log(`  - Heures totales: ${totalHours}\n`);
        } else {
            console.log(`❌ Erreur ${entriesResponse.status}:`, entriesResponse.data);
        }
        
        // 3. Tester la soumission
        console.log('3️⃣ Test de soumission...');
        const submitResponse = await makeRequest(`${API_BASE_URL}/time-sheet-approvals/${timeSheetId}/submit`, {
            method: 'POST'
        });
        
        console.log(`📤 Réponse de soumission: ${submitResponse.status}`);
        if (submitResponse.status === 400) {
            console.log(`  - Erreur: ${submitResponse.data.error}`);
        } else if (submitResponse.status === 200) {
            console.log(`  - Succès: ${JSON.stringify(submitResponse.data)}`);
        } else {
            console.log(`  - Réponse inattendue: ${JSON.stringify(submitResponse.data)}`);
        }
        
        // 4. Diagnostic
        console.log('\n🔍 Diagnostic:');
        if (timeSheetResponse.status === 200) {
            const status = timeSheetResponse.data.status;
            if (status === 'submitted') {
                console.log('  ✅ Le statut est "submitted" - la feuille a été soumise');
                console.log('  ℹ️ C\'est pourquoi vous ne pouvez pas la soumettre à nouveau');
            } else if (status === 'saved') {
                console.log('  ℹ️ Le statut est "saved" - la feuille peut être soumise');
                console.log('  ⚠️ Il y a peut-être un problème de synchronisation');
            } else {
                console.log(`  ⚠️ Statut inattendu: ${status}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    }
}

checkTimeSheetStatus();
