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

console.log('\n🔍 VÉRIFICATION COMPLÈTE API - EB-VISION 2.0');
console.log('============================================');
console.log(`Utilisateur cible : ${credentials.email}`);
console.log(`URL API           : ${API_URL}`);
console.log('---');

rl.question('🔑 Entrez le mot de passe pour cet utilisateur : ', async (password) => {
    credentials.password = password;
    rl.close();

    if (!password) {
        console.error('❌ Erreur : Mot de passe requis.');
        process.exit(1);
    }

    try {
        // 1. Authentification
        process.stdout.write('\n1. [AUTH] Connexion... ');
        const authResponse = await axios.post(`${API_URL}/auth/login`, credentials);

        if (!authResponse.data.success) throw new Error('Login échoué');
        const token = authResponse.data.data.token;
        console.log('✅ OK');
        // console.log('   Token:', token.substring(0, 20) + '...');

        const headers = { 'Authorization': `Bearer ${token}` };

        // 2. Lecture (GET)
        process.stdout.write('2. [READ] Lecture des entreprises... ');
        const getResponse = await axios.get(`${API_URL}/prospecting/companies`, { headers });
        if (!getResponse.data.success) throw new Error('Lecture échouée');
        console.log(`✅ OK (${getResponse.data.data.length} entreprises existantes)`);

        // 3. Création Source (POST)
        process.stdout.write('3. [CREATE] Création Source Test... ');
        const sourceData = { name: `TEST_SOURCE_${Date.now()}`, description: 'Validation Script' };
        const createSourceResponse = await axios.post(`${API_URL}/prospecting/sources`, sourceData, { headers });
        // Note: L'API retourne parfois l'objet directement ou dans .data
        const sourceId = createSourceResponse.data.id || (createSourceResponse.data.data && createSourceResponse.data.data.id);

        if (!createSourceResponse.data && !sourceId) throw new Error('Création Source échouée (Pas de réponse)');
        console.log('✅ OK (ID: ' + sourceId + ')');

        // 4. Création Entreprise (POST)
        process.stdout.write('4. [CREATE] Création Entreprise Test... ');
        // Petit délai pour assurer la dispo
        await new Promise(r => setTimeout(r, 500));

        const companyData = {
            name: `TEST_COMPANY_${Date.now()}`,
            source_id: sourceId,
            email: 'test@example.com',
            status: 'NEW'
        };
        const createCompanyResponse = await axios.post(`${API_URL}/prospecting/companies`, companyData, { headers });
        const companyId = createCompanyResponse.data.id || (createCompanyResponse.data.data && createCompanyResponse.data.data.id);

        if (!companyId) throw new Error('Création Entreprise échouée');
        console.log('✅ OK (ID: ' + companyId + ')');

        // 5. Nettoyage (DELETE)
        process.stdout.write('5. [DELETE] Nettoyage Test... ');
        await axios.delete(`${API_URL}/prospecting/companies/${companyId}`, { headers });
        await axios.delete(`${API_URL}/prospecting/sources/${sourceId}`, { headers });
        console.log('✅ OK');

        console.log('\n✨ SUCCÈS TOTAL : L\'API gère parfaitement le cycle de vie des données (CRUD).');

    } catch (error) {
        console.log('❌ ÉCHEC');
        if (error.response) {
            console.error('   Erreur HTTP :', error.response.status);
            console.error('   Détails :', error.response.data);
            if (error.response.data.errors) {
                console.error('   Validation :', JSON.stringify(error.response.data.errors));
            }
        } else {
            console.error('   Erreur :', error.message);
        }
    }
});
