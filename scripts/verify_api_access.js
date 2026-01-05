const axios = require('axios');
const readline = require('readline');

// URL de l'API de test
const API_URL = 'https://ebvision-test-api.bosssystemsai.com/api';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const credentials = {
    email: 'admin@ewmanagement.com',
    password: ''
};

console.log('\n🔍 AUDIT COMPLET DES ACCÈS API - EB-VISION 2.0');
console.log('==============================================');
console.log('Ce script vérifie exactement ce que le prestataire pourra voir et faire.');

rl.question('🔑 Mot de passe (admin@ewmanagement.com) : ', async (password) => {
    credentials.password = password;
    rl.close();

    if (!password) process.exit(1);

    try {
        // --- 1. AUTH ---
        console.log('\n🔐 1. AUTHENTIFICATION');
        const authRes = await axios.post(`${API_URL}/auth/login`, credentials);
        if (!authRes.data.success) throw new Error('Login failed');
        const token = authRes.data.data.token;
        const headers = { 'Authorization': `Bearer ${token}` };
        console.log('✅ Connecté.');

        // Helper pour afficher proprement
        const printData = (label, data) => {
            console.log(`\n   📄 DONNÉES : ${label} (${data ? data.length : 0} éléments)`);
            if (!data || data.length === 0) {
                console.log('      (Aucune donnée)');
            } else {
                const tableData = data.slice(0, 3).map(item => {
                    const cleanItem = {};
                    if (item.nom) cleanItem.nom = item.nom.substring(0, 30);
                    if (item.name) cleanItem.name = item.name.substring(0, 30);
                    if (item.email) cleanItem.email = item.email;
                    if (item.ville) cleanItem.ville = item.ville;
                    if (item.status) cleanItem.status = item.status;
                    return cleanItem;
                });
                console.table(tableData);
                if (data.length > 3) console.log(`      ... et ${data.length - 3} autres.`);
            }
        };

        // --- 2. CLIENTS ACTIFS (Données Internes) ---
        console.log('\n🏢 2. CLIENTS ACTIFS (Scope: Données Interne)');
        try {
            const getClients = await axios.get(`${API_URL}/clients`, { headers });
            console.log('✅ ACCÈS AUTORISÉ (Lecture seule possible)');
            printData('Clients Actifs', getClients.data.data.clients || []);
        } catch (e) {
            console.log('❌ ACCÈS REFUSÉ');
        }

        // --- 3. OPPORTUNITÉS (Scope: Conversion) ---
        console.log('\n💼 3. OPPORTUNITÉS (Scope: IA -> Opportunité)');
        // LIST
        try {
            process.stdout.write('   GET /opportunities ... ');
            const getOpps = await axios.get(`${API_URL}/opportunities`, { headers });
            console.log('✅ OK');
            printData('Opportunités existantes', getOpps.data.data.opportunities);
        } catch (e) { console.log('❌ Echec Lecture:', e.message); }

        // CREATE OPPORTUNITY
        // On a besoin d'un Business Unit ID valide. On va essayer d'en récupérer un.
        let buId = null;
        try {
            const buRes = await axios.get(`${API_URL}/business-units`, { headers });
            if (buRes.data.data && buRes.data.data.length > 0) {
                buId = buRes.data.data[0].id;
            }
        } catch (e) { }

        if (buId) {
            process.stdout.write('   POST /opportunities (Création test)... ');
            try {
                const newOpp = await axios.post(`${API_URL}/opportunities`, {
                    nom: `OPPORTUNITÉ IA TEST ${Date.now()}`,
                    description: 'Détectée par IA Audit',
                    business_unit_id: buId, // Requis
                    statut: 'NOUVELLE',
                    probabilite: 50
                }, { headers });
                const oppId = newOpp.data.data.opportunity.id;
                console.log(`✅ CRÉÉ (ID: ${oppId})`);

                // Cleanup
                process.stdout.write('   DELETE /opportunities (Nettoyage)... ');
                await axios.delete(`${API_URL}/opportunities/${oppId}`, { headers });
                console.log('✅ OK');

            } catch (e) {
                console.log('❌ Echec Création:', e.response ? e.response.data : e.message);
            }
        } else {
            console.log('⚠️ Impossible de tester la création (Pas de Business Unit accessible)');
        }


        // --- 4. PROSPECTION (Scope Prestataire) ---
        console.log('\n🎯 4. PROSPECTION (Scope: Prestataire)');

        // SOURCES
        console.log('   [SOURCES]');
        const getSources = await axios.get(`${API_URL}/prospecting/sources`, { headers });
        printData('Sources', getSources.data.data);

        // CREATE SOURCE
        process.stdout.write('   Création Source Test... ');
        const newSource = await axios.post(`${API_URL}/prospecting/sources`, {
            name: `TEST_SOURCE_${Date.now()}`,
            description: 'Audit Script'
        }, { headers });
        const sourceData = newSource.data.data || newSource.data;
        const sourceId = sourceData.id;
        console.log(`✅ OK (ID: ${sourceId})`);


        // ENTREPRISES (Prospects)
        console.log('\n   [ENTREPRISES / PROSPECTS]');
        const getCompanies = await axios.get(`${API_URL}/prospecting/companies`, { headers });
        printData('Prospects', getCompanies.data.data);

        // CREATE COMPANY
        process.stdout.write('   Création Prospect Test... ');
        const newCompany = await axios.post(`${API_URL}/prospecting/companies`, {
            name: `TEST_PROSPECT_${Date.now()}`,
            source_id: sourceId,
            email: 'audit@test.com',
            status: 'NEW'
        }, { headers });
        const companyData = newCompany.data.data || newCompany.data;
        const companyId = companyData.id;
        console.log(`✅ OK (ID: ${companyId})`);


        // CAMPAGNES
        console.log('\n   [CAMPAGNES]');
        const getCampaigns = await axios.get(`${API_URL}/prospecting/campaigns`, { headers });
        printData('Campagnes', getCampaigns.data.data);

        // --- 5. NETTOYAGE ---
        console.log('\n🧹 5. NETTOYAGE AUTOMATIQUE');
        if (companyId) {
            process.stdout.write('   Suppression Prospect... ');
            await axios.delete(`${API_URL}/prospecting/companies/${companyId}`, { headers });
            console.log('✅ OK');
        }

        if (sourceId) {
            process.stdout.write('   Suppression Source... ');
            await axios.delete(`${API_URL}/prospecting/sources/${sourceId}`, { headers });
            console.log('✅ OK');
        }

        console.log('\n✨ AUDIT TERMINÉ. Vérifiez les tableaux ci-dessus.');

    } catch (error) {
        console.log('\n❌ ERREUR PENDANT LE TEST');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', error.response.data);
        } else {
            console.log(error.message);
        }
    }
});
