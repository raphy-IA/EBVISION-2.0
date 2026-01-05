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
                // Créer une version simplifiée pour l'affichage tableau
                const tableData = data.slice(0, 3).map(item => {
                    // Garder seulement les champs pertinents pour la lisibilité
                    const cleanItem = {};
                    if (item.nom) cleanItem.nom = item.nom.substring(0, 30);
                    if (item.name) cleanItem.name = item.name.substring(0, 30);
                    if (item.email) cleanItem.email = item.email;
                    if (item.ville) cleanItem.ville = item.ville;
                    if (item.status) cleanItem.status = item.status;
                    if (item.channel) cleanItem.channel = item.channel;
                    return cleanItem;
                });
                console.table(tableData);
                if (data.length > 3) console.log(`      ... et ${data.length - 3} autres.`);
            }
        };

        // --- 2. CLIENTS ACTIFS (Données Internes) ---
        console.log('\n🏢 2. CLIENTS ACTIFS (Scope: Données Internes)');
        console.log('   Test d\'accès à la liste des clients actifs...');
        try {
            const getClients = await axios.get(`${API_URL}/clients`, { headers });
            console.log('✅ ACCÈS AUTORISÉ (Le prestataire *pourra* voir ceci)');
            printData('Clients Actifs', getClients.data.data.clients || []);
        } catch (e) {
            console.log('❌ ACCÈS REFUSÉ (Le prestataire ne pourra pas voir ceci)');
            if (e.response) console.log('   Raison:', e.response.status, e.response.statusText);
        }

        // --- 3. PROSPECTION (Scope Prestataire) ---
        console.log('\n🎯 3. PROSPECTION (Scope: Prestataire)');

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

        // --- 4. NETTOYAGE ---
        console.log('\n🧹 4. NETTOYAGE AUTOMATIQUE');
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
        console.log('   Ce que vous voyez dans les tableaux correspond aux droits actuels de ce compte.');

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
