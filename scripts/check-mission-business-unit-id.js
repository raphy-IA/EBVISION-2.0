const { pool } = require('../src/utils/database');

async function checkMissionBusinessUnitId() {
    try {
        console.log('🔍 Vérification du business_unit_id de la mission...');
        
        // Vérifier la mission spécifique
        const missionQuery = `
            SELECT 
                m.id,
                m.code,
                m.nom,
                m.business_unit_id,
                m.division_id,
                bu.nom as business_unit_nom,
                d.nom as division_nom,
                d.business_unit_id as division_business_unit_id
            FROM missions m
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            LEFT JOIN divisions d ON m.division_id = d.id
            WHERE m.code = 'MIS-20250804-553'
        `;
        
        const missionResult = await pool.query(missionQuery);
        
        if (missionResult.rows.length > 0) {
            const mission = missionResult.rows[0];
            console.log('📊 Mission MIS-20250804-553:');
            console.log('  - ID:', mission.id);
            console.log('  - Code:', mission.code);
            console.log('  - Nom:', mission.nom);
            console.log('  - Business Unit ID (mission):', mission.business_unit_id);
            console.log('  - Business Unit Nom (mission):', mission.business_unit_nom);
            console.log('  - Division ID:', mission.division_id);
            console.log('  - Division Nom:', mission.division_nom);
            console.log('  - Division Business Unit ID:', mission.division_business_unit_id);
            
            if (mission.business_unit_id) {
                console.log('✅ La mission a un business_unit_id');
            } else {
                console.log('❌ La mission n\'a PAS de business_unit_id');
                console.log('💡 Il faut mettre à jour la mission avec le business_unit_id de la division');
            }
        }
        
        // Solution : Mettre à jour la mission avec le business_unit_id de la division
        console.log('\n💡 SOLUTION:');
        console.log('Il faut mettre à jour la mission avec le business_unit_id de sa division.');
        
        const updateQuery = `
            UPDATE missions 
            SET business_unit_id = (
                SELECT business_unit_id 
                FROM divisions 
                WHERE id = missions.division_id
            )
            WHERE code = 'MIS-20250804-553'
            RETURNING *
        `;
        
        console.log('Requête SQL pour corriger:');
        console.log(updateQuery);
        
        // Exécuter la correction
        console.log('\n🔧 Application de la correction...');
        const updateResult = await pool.query(updateQuery);
        
        if (updateResult.rows.length > 0) {
            const updatedMission = updateResult.rows[0];
            console.log('✅ Mission mise à jour:');
            console.log('  - Business Unit ID:', updatedMission.business_unit_id);
        } else {
            console.log('❌ Aucune mission mise à jour');
        }
        
        // Vérifier le résultat
        console.log('\n🔍 Vérification après correction:');
        const verifyQuery = `
            SELECT 
                m.code,
                m.business_unit_id,
                m.division_id,
                bu.nom as business_unit_nom,
                d.nom as division_nom
            FROM missions m
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            LEFT JOIN divisions d ON m.division_id = d.id
            WHERE m.code = 'MIS-20250804-553'
        `;
        
        const verifyResult = await pool.query(verifyQuery);
        if (verifyResult.rows.length > 0) {
            const mission = verifyResult.rows[0];
            console.log('  - Code:', mission.code);
            console.log('  - Business Unit ID:', mission.business_unit_id);
            console.log('  - Business Unit Nom:', mission.business_unit_nom);
            console.log('  - Division Nom:', mission.division_nom);
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkMissionBusinessUnitId(); 