const { pool } = require('./src/utils/database');

async function verifierIdsCollaborateurs() {
    console.log('🔍 Vérification des IDs collaborateurs...');
    
    const client = await pool.connect();
    try {
        // 1. Vérifier Raphaël Ngos
        console.log('\n📋 Raphaël Ngos:');
        const raphaelResult = await client.query(`
            SELECT 
                u.id as user_id,
                u.nom,
                u.prenom,
                c.id as collaborateur_id,
                c.nom as collaborateur_nom,
                c.prenom as collaborateur_prenom
            FROM users u
            LEFT JOIN collaborateurs c ON u.id = c.user_id
            WHERE u.id = 'b306cee5-cab6-453a-b753-cdaa54cad0d4'
        `);
        console.log('Raphaël:', raphaelResult.rows[0]);
        
        // 2. Vérifier Cyrille Djiki
        console.log('\n📋 Cyrille Djiki:');
        const cyrilleResult = await client.query(`
            SELECT 
                u.id as user_id,
                u.nom,
                u.prenom,
                c.id as collaborateur_id,
                c.nom as collaborateur_nom,
                c.prenom as collaborateur_prenom
            FROM users u
            LEFT JOIN collaborateurs c ON u.id = c.user_id
            WHERE u.id = 'f6a6567f-b51d-4dbc-872d-1005156bd187'
        `);
        console.log('Cyrille:', cyrilleResult.rows[0]);
        
        // 3. Tester canSupervisorApprove avec le bon ID (collaborateur_id)
        const raphaelCollaborateurId = raphaelResult.rows[0]?.collaborateur_id;
        const timeSheetId = 'f5db5871-8872-4862-81f8-5b47ed7d8ec9';
        
        if (raphaelCollaborateurId) {
            console.log(`\n🔍 Test avec collaborateur_id (${raphaelCollaborateurId}):`);
            
            const TimeSheetApproval = require('./src/models/TimeSheetApproval');
            try {
                const canApprove = await TimeSheetApproval.canSupervisorApprove(timeSheetId, raphaelCollaborateurId);
                console.log('✅ canSupervisorApprove:', canApprove);
                
                // Tester la création
                const approval = await TimeSheetApproval.create(timeSheetId, raphaelCollaborateurId, 'approve', 'Test approbation');
                console.log('✅ Approbation créée:', approval);
                
            } catch (error) {
                console.error('❌ Erreur:', error);
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        client.release();
    }
}

verifierIdsCollaborateurs().catch(console.error);
