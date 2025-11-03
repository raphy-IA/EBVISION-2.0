// Script de test pour la création de compte utilisateur
const { pool } = require('../src/utils/database');

async function testUserCreation() {
    try {
        console.log('🧪 Test de création de compte utilisateur...\n');
        
        // 1. Vérifier qu'un collaborateur existe
        const collaborateurResult = await pool.query(`
            SELECT id, nom, prenom, email 
            FROM collaborateurs 
            WHERE user_id IS NULL 
            LIMIT 1
        `);
        
        if (collaborateurResult.rows.length === 0) {
            console.log('❌ Aucun collaborateur sans compte utilisateur trouvé');
            return;
        }
        
        const collaborateur = collaborateurResult.rows[0];
        console.log('👤 Collaborateur trouvé:', collaborateur);
        
        // 2. Vérifier que le rôle ADMIN existe
        const roleResult = await pool.query(`
            SELECT name FROM roles WHERE name = 'ADMIN'
        `);
        
        if (roleResult.rows.length === 0) {
            console.log('❌ Rôle ADMIN non trouvé');
            return;
        }
        
        console.log('✅ Rôle ADMIN trouvé');
        
        // 3. Tester la création avec le service
        const UserAccessService = require('../src/services/userAccessService');
        
        const testData = {
            id: collaborateur.id,
            nom: collaborateur.nom,
            prenom: collaborateur.prenom,
            email: collaborateur.email,
            login: 'test.login', // Login personnalisé
            role: 'ADMIN',       // Rôle sélectionné
            password: 'TestPass123!' // Mot de passe personnalisé
        };
        
        console.log('\n📝 Données de test:', testData);
        
        const result = await UserAccessService.createUserAccessForCollaborateur(testData);
        
        if (result.success) {
            console.log('\n✅ Compte utilisateur créé avec succès !');
            console.log('👤 Utilisateur:', result.user);
            console.log('🔑 Mot de passe:', result.password);
            
            // 4. Vérifier que l'utilisateur existe bien en base
            const userCheck = await pool.query(`
                SELECT u.*, c.nom as collaborateur_nom 
                FROM users u 
                JOIN collaborateurs c ON c.user_id = u.id 
                WHERE u.id = $1
            `, [result.user.id]);
            
            if (userCheck.rows.length > 0) {
                console.log('\n✅ Vérification en base réussie:');
                console.log('   - Utilisateur créé:', userCheck.rows[0]);
                console.log('   - Liaison collaborateur:', userCheck.rows[0].collaborateur_nom);
            } else {
                console.log('\n❌ L\'utilisateur n\'existe pas en base !');
            }
            
        } else {
            console.log('\n❌ Échec de la création:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du test:', error);
    } finally {
        await pool.end();
    }
}

testUserCreation();



















