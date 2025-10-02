// Script pour tester l'API de création de compte utilisateur
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function testAPIUserCreation() {
    try {
        console.log('🧪 Test de l\'API de création de compte utilisateur...\n');
        
        // 1. Se connecter en tant que SUPER_ADMIN
        console.log('🔐 Connexion en tant que SUPER_ADMIN...');
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: 'admin@trs.com',
            password: 'admin123'
        });
        
        if (!loginResponse.data.success) {
            console.log('❌ Échec de la connexion:', loginResponse.data.message);
            return;
        }
        
        const token = loginResponse.data.data.token;
        console.log('✅ Connexion réussie');
        
        // 2. Récupérer la liste des rôles disponibles
        console.log('\n📋 Récupération des rôles disponibles...');
        const rolesResponse = await axios.get(`${API_BASE_URL}/users/roles`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Rôles disponibles:', rolesResponse.data.map(r => r.name));
        
        // 3. Trouver un collaborateur sans compte utilisateur
        console.log('\n👤 Recherche d\'un collaborateur sans compte...');
        const collaborateursResponse = await axios.get(`${API_BASE_URL}/collaborateurs`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const collaborateurSansCompte = collaborateursResponse.data.data.find(c => !c.user_id);
        if (!collaborateurSansCompte) {
            console.log('❌ Aucun collaborateur sans compte trouvé');
            return;
        }
        
        console.log('✅ Collaborateur trouvé:', `${collaborateurSansCompte.nom} ${collaborateurSansCompte.prenom}`);
        
        // 4. Créer le compte utilisateur avec des données personnalisées
        console.log('\n🆕 Création du compte utilisateur...');
        const createUserResponse = await axios.post(
            `${API_BASE_URL}/collaborateurs/${collaborateurSansCompte.id}/generate-user-account`,
            {
                login: 'test.api.user',
                email: collaborateurSansCompte.email,
                nom: collaborateurSansCompte.nom,
                prenom: collaborateurSansCompte.prenom,
                role: 'CONSULTANT',
                password: 'TestAPI123!'
            },
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        
        if (createUserResponse.data.success) {
            console.log('✅ Compte utilisateur créé avec succès !');
            console.log('   👤 Utilisateur:', createUserResponse.data.data.user);
            console.log('   🔑 Mot de passe:', createUserResponse.data.data.password);
        } else {
            console.log('❌ Échec de la création:', createUserResponse.data.message);
        }
        
        // 5. Tester aussi avec génération automatique
        console.log('\n🎲 Test avec génération automatique...');
        const autreCollaborateur = collaborateursResponse.data.data.find(c => !c.user_id && c.id !== collaborateurSansCompte.id);
        
        if (autreCollaborateur) {
            const createAutoResponse = await axios.post(
                `${API_BASE_URL}/collaborateurs/${autreCollaborateur.id}/generate-user-account`,
                {
                    role: 'COLLABORATEUR' // Seul le rôle est spécifié
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            
            if (createAutoResponse.data.success) {
                console.log('✅ Compte avec génération automatique créé !');
                console.log('   👤 Login généré:', createAutoResponse.data.data.user?.login || 'N/A');
                console.log('   🔑 Mot de passe généré:', createAutoResponse.data.data.password || 'N/A');
            } else {
                console.log('❌ Échec de la génération automatique:', createAutoResponse.data.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.response?.data || error.message);
    }
}

testAPIUserCreation();
