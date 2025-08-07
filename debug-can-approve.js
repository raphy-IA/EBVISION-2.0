const { pool } = require('./src/utils/database');

async function debugCanApprove() {
    console.log('🔍 Débogage de canSupervisorApprove...');
    
    const client = await pool.connect();
    try {
        const timeSheetId = 'f5db5871-8872-4862-81f8-5b47ed7d8ec9';
        const supervisorUserId = 'b306cee5-cab6-453a-b753-cdaa54cad0d4';
        
        // 1. Vérifier le superviseur
        console.log('\n📋 Étape 1: Vérifier le superviseur');
        const supervisorResult = await client.query(`
            SELECT c.id as collaborateur_id, c.nom, c.prenom
            FROM users u
            JOIN collaborateurs c ON u.id = c.user_id
            WHERE u.id = $1
        `, [supervisorUserId]);
        console.log('Superviseur:', supervisorResult.rows[0]);
        
        if (supervisorResult.rows.length === 0) {
            console.log('❌ Superviseur non trouvé');
            return;
        }
        
        const supervisorCollaborateurId = supervisorResult.rows[0].collaborateur_id;
        
        // 2. Vérifier la feuille de temps
        console.log('\n📋 Étape 2: Vérifier la feuille de temps');
        const timeSheetResult = await client.query(`
            SELECT 
                ts.id,
                ts.status,
                ts.user_id,
                u.nom,
                u.prenom
            FROM time_sheets ts
            JOIN users u ON ts.user_id = u.id
            WHERE ts.id = $1
        `, [timeSheetId]);
        console.log('Feuille de temps:', timeSheetResult.rows[0]);
        
        if (timeSheetResult.rows.length === 0) {
            console.log('❌ Feuille de temps non trouvée');
            return;
        }
        
        const timeSheetUserId = timeSheetResult.rows[0].user_id;
        
        // 3. Vérifier le collaborateur de la feuille
        console.log('\n📋 Étape 3: Vérifier le collaborateur de la feuille');
        const collaborateurResult = await client.query(`
            SELECT c.id as collaborateur_id, c.nom, c.prenom
            FROM users u
            JOIN collaborateurs c ON u.id = c.user_id
            WHERE u.id = $1
        `, [timeSheetUserId]);
        console.log('Collaborateur de la feuille:', collaborateurResult.rows[0]);
        
        if (collaborateurResult.rows.length === 0) {
            console.log('❌ Collaborateur de la feuille non trouvé');
            return;
        }
        
        const collaborateurId = collaborateurResult.rows[0].collaborateur_id;
        
        // 4. Vérifier la relation superviseur-collaborateur
        console.log('\n📋 Étape 4: Vérifier la relation superviseur-collaborateur');
        const relationResult = await client.query(`
            SELECT 
                tss.id,
                tss.collaborateur_id,
                tss.supervisor_id,
                c1.nom as collaborateur_nom,
                c1.prenom as collaborateur_prenom,
                c2.nom as supervisor_nom,
                c2.prenom as supervisor_prenom
            FROM time_sheet_supervisors tss
            JOIN collaborateurs c1 ON tss.collaborateur_id = c1.id
            JOIN collaborateurs c2 ON tss.supervisor_id = c2.id
            WHERE tss.collaborateur_id = $1 AND tss.supervisor_id = $2
        `, [collaborateurId, supervisorCollaborateurId]);
        console.log('Relation trouvée:', relationResult.rows[0]);
        
        // 5. Test de la requête complète
        console.log('\n📋 Étape 5: Test de la requête complète');
        const finalResult = await client.query(`
            SELECT COUNT(*) as count
            FROM time_sheets ts
            JOIN users u ON ts.user_id = u.id
            JOIN collaborateurs c ON u.id = c.user_id
            JOIN time_sheet_supervisors tss ON c.id = tss.collaborateur_id
            WHERE ts.id = $1 
            AND tss.supervisor_id = $2
            AND ts.status = 'submitted'
        `, [timeSheetId, supervisorCollaborateurId]);
        console.log('Résultat final:', finalResult.rows[0]);
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        client.release();
    }
}

debugCanApprove().catch(console.error);
