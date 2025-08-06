const { pool } = require('./src/utils/database');

async function fixUserCollaborateur() {
    try {
        console.log('🔧 Vérification de l\'association utilisateur-collaborateur...');
        
        const userId = 'f6a6567f-b51d-4dbc-872d-1005156bd187';
        
        // 1. Vérifier l'utilisateur et son collaborateur associé
        console.log('🔍 Vérification de l\'utilisateur...');
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        
        if (userResult.rows.length === 0) {
            console.log('❌ Utilisateur non trouvé');
            return;
        }
        
        const user = userResult.rows[0];
        console.log('✅ Utilisateur trouvé:', user);
        
        // 2. Vérifier le collaborateur associé
        if (user.collaborateur_id) {
            console.log('🔍 Vérification du collaborateur associé...');
            const collaborateurResult = await pool.query('SELECT * FROM collaborateurs WHERE id = $1', [user.collaborateur_id]);
            
            if (collaborateurResult.rows.length > 0) {
                console.log('✅ Collaborateur associé trouvé:', collaborateurResult.rows[0]);
                
                // 3. Test de création d'une feuille de temps avec le collaborateur existant
                console.log('🧪 Test de création de feuille de temps...');
                const testTimeSheet = await pool.query(`
                    INSERT INTO time_sheets (
                        collaborateur_id, date_debut_semaine, date_fin_semaine, annee, semaine, statut
                    ) VALUES (
                        $1,
                        '2025-08-04',
                        '2025-08-10',
                        2025,
                        32,
                        'draft'
                    ) RETURNING id
                `, [user.collaborateur_id]);
                
                console.log('✅ Test time_sheets réussi, ID:', testTimeSheet.rows[0].id);
                
                // Nettoyer le test
                await pool.query('DELETE FROM time_sheets WHERE id = $1', [testTimeSheet.rows[0].id]);
                
                console.log('🎉 Association utilisateur-collaborateur fonctionne correctement !');
            } else {
                console.log('❌ Collaborateur associé non trouvé');
            }
        } else {
            console.log('❌ Aucun collaborateur associé à l\'utilisateur');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

fixUserCollaborateur(); 