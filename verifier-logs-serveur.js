const { pool } = require('./src/utils/database');

async function verifierLogsServeur() {
    console.log('🔍 Vérification des logs du serveur...');
    
    const client = await pool.connect();
    try {
        // 1. Vérifier si la feuille existe et son statut
        const timeSheetId = '57499401-2882-412e-9aba-efb97a42dff0';
        console.log('\n📋 Vérification de la feuille de temps:');
        
        const timeSheetResult = await client.query(`
            SELECT 
                ts.id,
                ts.status,
                ts.user_id,
                ts.created_at,
                ts.updated_at
            FROM time_sheets ts
            WHERE ts.id = $1
        `, [timeSheetId]);
        
        console.log('Feuille de temps:', timeSheetResult.rows[0]);
        
        // 2. Vérifier les approbations existantes
        console.log('\n📋 Approbations existantes:');
        const approvalsResult = await client.query(`
            SELECT 
                tsa.id,
                tsa.time_sheet_id,
                tsa.supervisor_id,
                tsa.action,
                tsa.comment,
                tsa.created_at
            FROM time_sheet_approvals tsa
            WHERE tsa.time_sheet_id = $1
        `, [timeSheetId]);
        
        console.log('Approbations:', approvalsResult.rows);
        
        // 3. Vérifier les erreurs récentes dans les logs
        console.log('\n📋 Vérification des erreurs potentielles:');
        
        // Vérifier si la feuille a déjà été approuvée
        if (timeSheetResult.rows.length > 0) {
            const status = timeSheetResult.rows[0].status;
            console.log('Statut actuel:', status);
            
            if (status === 'approved') {
                console.log('⚠️ La feuille est déjà approuvée !');
            } else if (status === 'rejected') {
                console.log('⚠️ La feuille a été rejetée !');
            } else if (status === 'submitted') {
                console.log('✅ La feuille est en attente d\'approbation');
            }
        }
        
        // 4. Simuler l'erreur potentielle
        console.log('\n🔍 Simulation de l\'erreur:');
        const TimeSheetApproval = require('./src/models/TimeSheetApproval');
        
        try {
            const supervisorUserId = 'b306cee5-cab6-453a-b753-cdaa54cad0d4';
            const canApprove = await TimeSheetApproval.canSupervisorApprove(timeSheetId, supervisorUserId);
            console.log('canSupervisorApprove:', canApprove);
            
            if (canApprove) {
                console.log('✅ Le superviseur peut approuver');
            } else {
                console.log('❌ Le superviseur ne peut pas approuver');
            }
        } catch (error) {
            console.error('❌ Erreur lors du test:', error);
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        client.release();
    }
}

verifierLogsServeur().catch(console.error);
