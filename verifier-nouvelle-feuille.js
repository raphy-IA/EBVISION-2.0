const { pool } = require('./src/utils/database');

async function verifierNouvelleFeuille() {
    console.log('🔍 Vérification de la nouvelle feuille de temps...');
    
    const client = await pool.connect();
    try {
        const timeSheetId = '57499401-2882-412e-9aba-efb97a42dff0';
        const supervisorUserId = 'b306cee5-cab6-453a-b753-cdaa54cad0d4'; // Raphaël Ngos
        
        // 1. Vérifier la feuille de temps
        console.log('\n📋 Détails de la feuille de temps:');
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
        
        // 2. Vérifier le collaborateur de la feuille
        console.log('\n📋 Collaborateur de la feuille:');
        const collaborateurResult = await client.query(`
            SELECT c.id as collaborateur_id, c.nom, c.prenom
            FROM users u
            JOIN collaborateurs c ON u.id = c.user_id
            WHERE u.id = $1
        `, [timeSheetUserId]);
        console.log('Collaborateur:', collaborateurResult.rows[0]);
        
        if (collaborateurResult.rows.length === 0) {
            console.log('❌ Collaborateur non trouvé');
            return;
        }
        
        const collaborateurId = collaborateurResult.rows[0].collaborateur_id;
        
        // 3. Vérifier le superviseur
        console.log('\n📋 Superviseur:');
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
        
        // 4. Vérifier la relation superviseur-collaborateur
        console.log('\n📋 Relation superviseur-collaborateur:');
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
        
        // 5. Tester canSupervisorApprove
        console.log('\n🔍 Test canSupervisorApprove:');
        const TimeSheetApproval = require('./src/models/TimeSheetApproval');
        const canApprove = await TimeSheetApproval.canSupervisorApprove(timeSheetId, supervisorUserId);
        console.log('✅ canSupervisorApprove:', canApprove);
        
        if (canApprove) {
            // 6. Tester la création d'approbation
            console.log('\n🔍 Test création d\'approbation:');
            const approval = await TimeSheetApproval.create(timeSheetId, supervisorUserId, 'approve', 'Test approbation nouvelle feuille');
            console.log('✅ Approbation créée:', approval);
        } else {
            console.log('❌ Le superviseur ne peut pas approuver cette feuille');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        client.release();
    }
}

verifierNouvelleFeuille().catch(console.error);
