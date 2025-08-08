const { pool } = require('./src/utils/database');

async function fixCyrilleCollaborateurLink() {
    try {
        console.log('🔍 Vérification et correction de la liaison Cyrille Djiki...');
        
        // 1. Vérifier l'utilisateur Cyrille
        const userQuery = `
            SELECT * FROM users 
            WHERE nom = 'Djiki' AND prenom = 'Cyrille'
        `;
        
        const userResult = await pool.query(userQuery);
        console.log('📊 Utilisateurs trouvés:', userResult.rows.length);
        
        if (userResult.rows.length === 0) {
            console.log('❌ Utilisateur Cyrille Djiki non trouvé');
            return;
        }
        
        const user = userResult.rows[0];
        console.log('✅ Utilisateur trouvé:', {
            id: user.id,
            nom: user.nom,
            prenom: user.prenom,
            collaborateur_id: user.collaborateur_id
        });
        
        // 2. Vérifier le collaborateur
        const collaborateurQuery = `
            SELECT c.*, bu.nom as business_unit_nom
            FROM collaborateurs c
            LEFT JOIN business_units bu ON c.business_unit_id = bu.id
            WHERE c.nom = 'Djiki' AND c.prenom = 'Cyrille'
        `;
        
        const collaborateurResult = await pool.query(collaborateurQuery);
        console.log('📊 Collaborateurs trouvés:', collaborateurResult.rows.length);
        
        if (collaborateurResult.rows.length === 0) {
            console.log('❌ Collaborateur Cyrille Djiki non trouvé');
            return;
        }
        
        const collaborateur = collaborateurResult.rows[0];
        console.log('✅ Collaborateur trouvé:', {
            id: collaborateur.id,
            nom: collaborateur.nom,
            prenom: collaborateur.prenom,
            business_unit_id: collaborateur.business_unit_id,
            business_unit_nom: collaborateur.business_unit_nom
        });
        
        // 3. Corriger la liaison si nécessaire
        if (!user.collaborateur_id || user.collaborateur_id !== collaborateur.id) {
            console.log('🔗 Correction de la liaison utilisateur-collaborateur...');
            
            const updateQuery = `
                UPDATE users 
                SET collaborateur_id = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `;
            
            await pool.query(updateQuery, [collaborateur.id, user.id]);
            console.log('✅ Liaison corrigée avec succès');
            
            // Vérifier la correction
            const verifyQuery = `
                SELECT * FROM users WHERE id = $1
            `;
            const verifyResult = await pool.query(verifyQuery, [user.id]);
            console.log('✅ Vérification après correction:', {
                id: verifyResult.rows[0].id,
                collaborateur_id: verifyResult.rows[0].collaborateur_id
            });
        } else {
            console.log('ℹ️ La liaison est déjà correcte');
        }
        
        // 4. Test de l'endpoint /api/auth/me
        console.log('\n🧪 Test de l\'endpoint /api/auth/me...');
        
        // Simuler l'appel de l'endpoint
        const User = require('./src/models/User');
        const Collaborateur = require('./src/models/Collaborateur');
        
        const testUser = await User.findById(user.id);
        console.log('👤 Test utilisateur:', {
            id: testUser.id,
            collaborateur_id: testUser.collaborateur_id
        });
        
        if (testUser.collaborateur_id) {
            const testCollaborateur = await Collaborateur.findById(testUser.collaborateur_id);
            console.log('👥 Test collaborateur:', testCollaborateur ? {
                id: testCollaborateur.id,
                business_unit_id: testCollaborateur.business_unit_id,
                business_unit_nom: testCollaborateur.business_unit_nom
            } : 'null');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

fixCyrilleCollaborateurLink();
