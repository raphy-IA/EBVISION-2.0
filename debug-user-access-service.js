const UserAccessService = require('./src/services/userAccessService');

async function debugUserAccessService() {
    try {
        console.log('🔍 Test direct du service UserAccessService...\n');
        
        // 1. Test de génération de mot de passe
        console.log('1️⃣ Test de génération de mot de passe:');
        const tempPassword = UserAccessService.generateTempPassword();
        console.log(`   Mot de passe généré: ${tempPassword}`);
        
        // 2. Test de génération de login
        console.log('\n2️⃣ Test de génération de login:');
        const testLogin = await UserAccessService.generateUniqueLogin('Test', 'API');
        console.log(`   Login généré: ${testLogin}`);
        
        // 3. Test de création d'accès utilisateur
        console.log('\n3️⃣ Test de création d\'accès utilisateur:');
        
        const mockCollaborateur = {
            id: '8bb5bcd1-3fb1-454e-a6ca-da400376c656', // ID du collaborateur créé précédemment
            nom: 'Test',
            prenom: 'API',
            email: 'test.api.1754252140005@trs.com'
        };
        
        console.log('📤 Données du collaborateur:', mockCollaborateur);
        
        const result = await UserAccessService.createUserAccessForCollaborateur(mockCollaborateur);
        
        if (result.success) {
            console.log('✅ Compte utilisateur créé avec succès !');
            console.log('📧 Informations de connexion:');
            console.log(`  - Email: ${result.user.email}`);
            console.log(`  - Login: ${result.user.login}`);
            console.log(`  - Mot de passe temporaire: ${result.tempPassword}`);
            console.log(`  - Rôle: ${result.user.role}`);
        } else {
            console.log('❌ Erreur lors de la création du compte utilisateur');
            console.log('Erreur:', result.error);
        }
        
        console.log('\n✅ Test terminé !');
        
    } catch (error) {
        console.error('❌ Erreur générale:', error);
    }
}

debugUserAccessService(); 