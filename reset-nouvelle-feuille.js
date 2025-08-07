const { pool } = require('./src/utils/database');

async function resetNouvelleFeuille() {
    console.log('🔄 Remise à zéro de la nouvelle feuille de temps...');
    
    const client = await pool.connect();
    try {
        const timeSheetId = '57499401-2882-412e-9aba-efb97a42dff0';
        
        // 1. Vérifier le statut actuel
        console.log('\n📋 Statut actuel:');
        const currentStatus = await client.query(`
            SELECT status FROM time_sheets WHERE id = $1
        `, [timeSheetId]);
        console.log('Statut actuel:', currentStatus.rows[0]?.status);
        
        // 2. Remettre au statut submitted
        console.log('\n🔄 Remise au statut submitted...');
        await client.query(`
            UPDATE time_sheets 
            SET status = 'submitted', updated_at = NOW()
            WHERE id = $1
        `, [timeSheetId]);
        
        // 3. Supprimer les approbations existantes
        console.log('\n🗑️ Suppression des approbations existantes...');
        await client.query(`
            DELETE FROM time_sheet_approvals 
            WHERE time_sheet_id = $1
        `, [timeSheetId]);
        
        // 4. Vérifier le nouveau statut
        console.log('\n✅ Vérification du nouveau statut:');
        const newStatus = await client.query(`
            SELECT status FROM time_sheets WHERE id = $1
        `, [timeSheetId]);
        console.log('Nouveau statut:', newStatus.rows[0]?.status);
        
        console.log('\n✅ Nouvelle feuille de temps remise au statut submitted !');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        client.release();
    }
}

resetNouvelleFeuille().catch(console.error);
