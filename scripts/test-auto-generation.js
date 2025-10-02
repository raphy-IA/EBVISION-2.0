// Script de test pour la génération automatique
const { pool } = require('../src/utils/database');

async function testAutoGeneration() {
    try {
        console.log('🧪 Test de génération automatique...\n');
        
        // 1. Vérifier qu'un autre collaborateur existe
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
        
        // 2. Tester la création avec génération automatique
        const UserAccessService = require('../src/services/userAccessService');
        
        const testData = {
            id: collaborateur.id,
            nom: collaborateur.nom,
            prenom: collaborateur.prenom,
            email: collaborateur.email,
            role: 'COLLABORATEUR' // Rôle sélectionné, mais pas de login/password
        };
        
        console.log('\n📝 Données de test (génération auto):', testData);
        
        const result = await UserAccessService.createUserAccessForCollaborateur(testData);
        
        if (result.success) {
            console.log('\n✅ Compte utilisateur créé avec génération automatique !');
            console.log('👤 Utilisateur:', result.user);
            console.log('🔑 Mot de passe généré:', result.password);
            console.log('👤 Login généré:', result.user.login);
            
            // 3. Vérifier que l'utilisateur existe bien en base
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
                console.log('   - Rôle appliqué:', userCheck.rows[0].role);
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

testAutoGeneration();
