const { pool } = require('../src/utils/database');

async function checkTasksStructure() {
    try {
        console.log('🔍 Vérification de la structure de la table tasks...');
        
        // Structure de la table tasks
        const tasksStructureQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'tasks' 
            ORDER BY ordinal_position
        `;
        const tasksStructureResult = await pool.query(tasksStructureQuery);
        console.log('📋 Structure de la table tasks:');
        tasksStructureResult.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
        });
        
        // Vérifier les données existantes
        console.log('\n📊 Données existantes dans tasks:');
        const tasksDataQuery = `
            SELECT id, libelle, description, duree_estimee
            FROM tasks 
            LIMIT 5
        `;
        const tasksDataResult = await pool.query(tasksDataQuery);
        tasksDataResult.rows.forEach((task, index) => {
            console.log(`  ${index + 1}. ${task.libelle} (${task.description})`);
        });
        
        // Vérifier les mission_tasks existantes
        console.log('\n📋 Mission tasks existantes:');
        const missionTasksQuery = `
            SELECT 
                mt.id,
                mt.statut,
                mt.date_debut,
                mt.date_fin,
                mt.duree_planifiee,
                t.libelle as task_libelle
            FROM mission_tasks mt
            LEFT JOIN tasks t ON mt.task_id = t.id
            LIMIT 5
        `;
        const missionTasksResult = await pool.query(missionTasksQuery);
        missionTasksResult.rows.forEach((mt, index) => {
            console.log(`  ${index + 1}. ${mt.task_libelle || 'N/A'} - ${mt.statut}`);
            console.log(`     - Date début: ${mt.date_debut}`);
            console.log(`     - Date fin: ${mt.date_fin}`);
            console.log(`     - Durée planifiée: ${mt.duree_planifiee} heures`);
        });
        
        // Vérifier les task_assignments existantes
        console.log('\n👤 Task assignments existantes:');
        const taskAssignmentsQuery = `
            SELECT 
                ta.heures_planifiees,
                ta.heures_effectuees,
                ta.taux_horaire,
                ta.statut,
                c.nom as collaborateur_nom,
                c.prenom as collaborateur_prenom
            FROM task_assignments ta
            LEFT JOIN collaborateurs c ON ta.collaborateur_id = c.id
            LIMIT 5
        `;
        const taskAssignmentsResult = await pool.query(taskAssignmentsQuery);
        taskAssignmentsResult.rows.forEach((ta, index) => {
            console.log(`  ${index + 1}. ${ta.collaborateur_prenom} ${ta.collaborateur_nom}`);
            console.log(`     - Heures planifiées: ${ta.heures_planifiees}`);
            console.log(`     - Heures effectuées: ${ta.heures_effectuees}`);
            console.log(`     - Taux horaire: ${ta.taux_horaire}`);
            console.log(`     - Statut: ${ta.statut}`);
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkTasksStructure(); 