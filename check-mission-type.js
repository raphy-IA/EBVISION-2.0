const { pool } = require('./src/utils/database');

async function checkMissionType() {
    try {
        console.log('🔍 Vérification du type de mission...');
        
        const missionId = 'f1b5a971-3a94-473d-af5b-7922348d8a1d';
        
        const result = await pool.query(`
            SELECT 
                m.nom,
                m.mission_type_id,
                mt.libelle as mission_type_nom,
                mt.codification as mission_type_code
            FROM missions m
            LEFT JOIN mission_types mt ON m.mission_type_id = mt.id
            WHERE m.id = $1
        `, [missionId]);
        
        console.log('📋 Type de mission:', JSON.stringify(result.rows[0], null, 2));
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkMissionType(); 