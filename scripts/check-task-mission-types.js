const { pool } = require('../src/utils/database');

async function checkTaskMissionTypes() {
    try {
        console.log('🔍 Vérification des associations tâches-types de mission...');
        
        // Vérifier les associations
        const associationsResult = await pool.query(`
            SELECT 
                tmt.*,
                t.code as task_code,
                t.libelle as task_libelle,
                mt.codification as mission_type_code,
                mt.libelle as mission_type_libelle
            FROM task_mission_types tmt
            JOIN tasks t ON tmt.task_id = t.id
            JOIN mission_types mt ON tmt.mission_type_id = mt.id
            ORDER BY mt.codification, tmt.ordre
        `);
        
        console.log(`✅ ${associationsResult.rows.length} associations trouvées:`);
        associationsResult.rows.forEach(assoc => {
            console.log(`   - ${assoc.task_code} (${assoc.task_libelle}) -> ${assoc.mission_type_code} (${assoc.mission_type_libelle}) - Ordre: ${assoc.ordre} - Obligatoire: ${assoc.obligatoire}`);
        });
        
        // Vérifier les tâches disponibles
        const tasksResult = await pool.query('SELECT id, code, libelle, actif FROM tasks WHERE actif = true');
        console.log(`\n📋 ${tasksResult.rows.length} tâches actives disponibles:`);
        tasksResult.rows.forEach(task => {
            console.log(`   - ${task.code}: ${task.libelle}`);
        });
        
        // Vérifier les types de mission
        const missionTypesResult = await pool.query('SELECT id, codification, libelle, actif FROM mission_types WHERE actif = true');
        console.log(`\n🎯 ${missionTypesResult.rows.length} types de mission actifs:`);
        missionTypesResult.rows.forEach(type => {
            console.log(`   - ${type.codification}: ${type.libelle}`);
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkTaskMissionTypes(); 