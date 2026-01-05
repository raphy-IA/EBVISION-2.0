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

console.log('\n🔍 VÉRIFICATION DE L\'ACCÈS API - EB-VISION 2.0');
console.log('================================================');
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
        console.log('\n1. Tentative de connexion...');
        const authResponse = await axios.post(`${API_URL}/auth/login`, credentials);

        if (authResponse.data.success) {
            const token = authResponse.data.data.token;
            console.log('✅ Connexion RÉUSSIE !');
            console.log('🎫 Token JWT reçu (début) :', token.substring(0, 50) + '...');

            // 2. Test d'une route protégée
            console.log('\n2. Test d\'accès à une route protégée (/prospecting/companies)...');
            try {
                const apiResponse = await axios.get(`${API_URL}/prospecting/companies`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (apiResponse.data.success) {
                    console.log('✅ Accès API RÉUSSI !');
                    console.log(`📊 Données reçues : ${apiResponse.data.data.length} entreprise(s) trouvée(s).`);
                    console.log('\n✨ CONCLUSION : L\'API fonctionne parfaitement.');
                    console.log('   Le prestataire devra suivre exactement ce même processus.');
                } else {
                    console.error('❌ Erreur API (Logique) :', apiResponse.data);
                }

            } catch (apiError) {
                console.error('❌ Erreur API (HTTP) :', apiError.response ? apiError.response.data : apiError.message);
                if (apiError.response && apiError.response.status === 403) {
                    console.log('   Note: Vérifiez que l\'utilisateur a bien les droits d\'accès.');
                }
            }

        } else {
            console.error('❌ Login échoué :', authResponse.data.message);
        }

    } catch (error) {
        if (error.response) {
            console.error('❌ Erreur HTTP :', error.response.status, error.response.statusText);
            console.error('   Détails :', error.response.data);
        } else {
            console.error('❌ Erreur Réseau/Script :', error.message);
        }
        console.log('\nConseil : Vérifiez que le serveur de test est bien à jour (git pull + redéploiement).');
    }
});
