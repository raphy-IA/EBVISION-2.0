const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'eb_vision_2_0',
    user: 'postgres',
    password: 'password'
});

async function checkTimeSheetStatus() {
    try {
        console.log('🔍 Vérification du statut de la feuille de temps...\n');
        
        // Vérifier la feuille de temps pour la semaine du 4 août 2025
        const timeSheetId = '1f66da03-79ef-42a3-aa20-b2cd91d80d0a';
        const userId = 'f6a6567f-b51d-4dbc-872d-1005156bd187';
        
        console.log('📋 Informations de recherche:');
        console.log(`  - TimeSheet ID: ${timeSheetId}`);
        console.log(`  - User ID: ${userId}`);
        console.log(`  - Semaine: 2025-08-04 à 2025-08-09\n`);
        
        // Vérifier la feuille de temps
        const timeSheetQuery = `
            SELECT id, user_id, week_start, week_end, status, created_at, updated_at
            FROM time_sheets 
            WHERE id = $1
        `;
        
        const timeSheetResult = await pool.query(timeSheetQuery, [timeSheetId]);
        
        if (timeSheetResult.rows.length === 0) {
            console.log('❌ Feuille de temps non trouvée');
            return;
        }
        
        const timeSheet = timeSheetResult.rows[0];
        console.log('✅ Feuille de temps trouvée:');
        console.log(`  - ID: ${timeSheet.id}`);
        console.log(`  - User ID: ${timeSheet.user_id}`);
        console.log(`  - Semaine: ${timeSheet.week_start} à ${timeSheet.week_end}`);
        console.log(`  - Statut: ${timeSheet.status}`);
        console.log(`  - Créée le: ${timeSheet.created_at}`);
        console.log(`  - Modifiée le: ${timeSheet.updated_at}\n`);
        
        // Vérifier les entrées de temps
        const entriesQuery = `
            SELECT COUNT(*) as total_entries,
                   COUNT(CASE WHEN type_heures = 'HC' THEN 1 END) as hc_entries,
                   COUNT(CASE WHEN type_heures = 'HNC' THEN 1 END) as hnc_entries,
                   SUM(heures) as total_heures
            FROM time_entries 
            WHERE time_sheet_id = $1
        `;
        
        const entriesResult = await pool.query(entriesQuery, [timeSheetId]);
        const entries = entriesResult.rows[0];
        
        console.log('📊 Entrées de temps:');
        console.log(`  - Total: ${entries.total_entries}`);
        console.log(`  - HC: ${entries.hc_entries}`);
        console.log(`  - HNC: ${entries.hnc_entries}`);
        console.log(`  - Heures totales: ${entries.total_heures || 0}\n`);
        
        // Vérifier les approbations
        const approvalsQuery = `
            SELECT COUNT(*) as total_approvals
            FROM time_sheet_approvals 
            WHERE time_sheet_id = $1
        `;
        
        const approvalsResult = await pool.query(approvalsQuery, [timeSheetId]);
        const approvals = approvalsResult.rows[0];
        
        console.log('📋 Approbations:');
        console.log(`  - Total: ${approvals.total_approvals}\n`);
        
        // Diagnostic
        console.log('🔍 Diagnostic:');
        if (timeSheet.status === 'submitted') {
            console.log('  ✅ Le statut est bien "submitted" - la feuille a été soumise');
        } else if (timeSheet.status === 'saved') {
            console.log('  ℹ️ Le statut est "saved" - la feuille peut être soumise');
        } else {
            console.log(`  ⚠️ Statut inattendu: ${timeSheet.status}`);
        }
        
        if (entries.total_entries > 0) {
            console.log('  ✅ Des entrées de temps existent');
        } else {
            console.log('  ⚠️ Aucune entrée de temps trouvée');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

checkTimeSheetStatus();
