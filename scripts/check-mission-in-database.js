const { pool } = require('../src/utils/database');

async function checkMissionInDatabase() {
    try {
        console.log('🔍 Vérification directe en base de données...');
        
        // Vérifier la mission créée
        const missionQuery = `
            SELECT 
                m.*,
                c.nom as client_nom,
                bu.nom as business_unit_nom,
                d.nom as division_nom
            FROM missions m
            LEFT JOIN clients c ON m.client_id = c.id
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            LEFT JOIN divisions d ON m.division_id = d.id
            WHERE m.code LIKE 'TEST-MISSION-CORRECT%'
            ORDER BY m.created_at DESC
            LIMIT 1
        `;
        
        const missionResult = await pool.query(missionQuery);
        
        if (missionResult.rows.length > 0) {
            const mission = missionResult.rows[0];
            console.log('📊 Mission trouvée en base:');
            console.log('  - Code:', mission.code);
            console.log('  - Nom:', mission.nom);
            console.log('  - Client:', mission.client_nom);
            console.log('  - Business Unit ID:', mission.business_unit_id);
            console.log('  - Business Unit Nom:', mission.business_unit_nom);
            console.log('  - Division ID:', mission.division_id);
            console.log('  - Division Nom:', mission.division_nom);
            console.log('  - Budget:', mission.budget_estime);
            console.log('  - Devise:', mission.devise);
            console.log('  - Date création:', mission.created_at);
        } else {
            console.log('❌ Aucune mission trouvée');
        }
        
        // Vérifier toutes les missions récentes
        console.log('\n📋 Toutes les missions récentes:');
        const allMissionsQuery = `
            SELECT 
                m.code, m.nom, m.business_unit_id, m.division_id,
                bu.nom as business_unit_nom,
                d.nom as division_nom,
                m.created_at
            FROM missions m
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            LEFT JOIN divisions d ON m.division_id = d.id
            ORDER BY m.created_at DESC
            LIMIT 5
        `;
        
        const allMissionsResult = await pool.query(allMissionsQuery);
        allMissionsResult.rows.forEach((mission, index) => {
            console.log(`${index + 1}. ${mission.code} - ${mission.nom}`);
            console.log(`   Business Unit: ${mission.business_unit_nom || 'N/A'} (ID: ${mission.business_unit_id})`);
            console.log(`   Division: ${mission.division_nom || 'N/A'} (ID: ${mission.division_id})`);
            console.log(`   Date: ${mission.created_at}`);
            console.log('   ---');
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkMissionInDatabase(); 