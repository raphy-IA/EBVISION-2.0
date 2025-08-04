const { pool } = require('./src/utils/database');

async function debugCollaborateurCreation() {
    try {
        console.log('🔍 Diagnostic de la création de collaborateurs...\n');
        
        // 1. Vérifier les collaborateurs récents
        console.log('1️⃣ Collaborateurs récents:');
        const collaborateurs = await pool.query(`
            SELECT id, nom, prenom, email, user_id, created_at
            FROM collaborateurs 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        
        console.log('📊 Collaborateurs trouvés:', collaborateurs.rows.length);
        collaborateurs.rows.forEach((collab, index) => {
            console.log(`  ${index + 1}. ${collab.prenom} ${collab.nom} (${collab.email})`);
            console.log(`     - ID: ${collab.id}`);
            console.log(`     - User ID: ${collab.user_id || 'AUCUN'}`);
            console.log(`     - Créé le: ${collab.created_at}`);
            console.log('');
        });
        
        // 2. Vérifier les utilisateurs récents
        console.log('2️⃣ Utilisateurs récents:');
        const users = await pool.query(`
            SELECT id, nom, prenom, email, login, role, created_at
            FROM users 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        
        console.log('📊 Utilisateurs trouvés:', users.rows.length);
        users.rows.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.prenom} ${user.nom} (${user.email})`);
            console.log(`     - ID: ${user.id}`);
            console.log(`     - Login: ${user.login}`);
            console.log(`     - Role: ${user.role}`);
            console.log(`     - Créé le: ${user.created_at}`);
            console.log('');
        });
        
        // 3. Vérifier les collaborateurs sans compte utilisateur
        console.log('3️⃣ Collaborateurs sans compte utilisateur:');
        const collaborateursSansUser = await pool.query(`
            SELECT id, nom, prenom, email, created_at
            FROM collaborateurs 
            WHERE user_id IS NULL
            ORDER BY created_at DESC
        `);
        
        console.log('📊 Collaborateurs sans compte utilisateur:', collaborateursSansUser.rows.length);
        collaborateursSansUser.rows.forEach((collab, index) => {
            console.log(`  ${index + 1}. ${collab.prenom} ${collab.nom} (${collab.email})`);
            console.log(`     - ID: ${collab.id}`);
            console.log(`     - Créé le: ${collab.created_at}`);
        });
        
        // 4. Vérifier la route de création de collaborateurs
        console.log('\n4️⃣ Vérification de la route collaborateurs...');
        const routeFile = require('fs').readFileSync('./src/routes/collaborateurs.js', 'utf8');
        
        if (routeFile.includes('createUserAccess')) {
            console.log('✅ La route contient la logique createUserAccess');
        } else {
            console.log('❌ La route ne contient PAS la logique createUserAccess');
        }
        
        if (routeFile.includes('UserAccessService')) {
            console.log('✅ La route importe UserAccessService');
        } else {
            console.log('❌ La route n\'importe PAS UserAccessService');
        }
        
        // 5. Vérifier le service UserAccessService
        console.log('\n5️⃣ Vérification du service UserAccessService...');
        try {
            const UserAccessService = require('./src/services/userAccessService');
            console.log('✅ UserAccessService est disponible');
            
            // Test de génération de login
            const testLogin = await UserAccessService.generateUniqueLogin('Test', 'User');
            console.log(`✅ Test de génération de login: ${testLogin}`);
            
        } catch (error) {
            console.log('❌ Erreur avec UserAccessService:', error.message);
        }
        
        await pool.end();
        
        console.log('\n✅ Diagnostic terminé !');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

debugCollaborateurCreation(); 