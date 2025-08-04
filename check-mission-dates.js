const { pool } = require('./src/utils/database');

async function checkMissionDates() {
    try {
        console.log('🔍 Vérification des dates de la mission...');
        
        const missionId = 'f1b5a971-3a94-473d-af5b-7922348d8a1d';
        
        const result = await pool.query(
            'SELECT date_fin, date_fin_reelle, statut, budget_estime, budget_reel, montant_honoraires, montant_debours FROM missions WHERE id = $1',
            [missionId]
        );
        
        console.log('📋 Dates et données financières:', JSON.stringify(result.rows[0], null, 2));
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkMissionDates(); 