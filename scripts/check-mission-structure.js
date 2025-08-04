const { pool } = require('../src/utils/database');

async function checkMissionStructure() {
    try {
        console.log('🔍 Analyse de la structure des missions et leurs données...');
        
        // 1. Structure de la table missions
        console.log('\n📋 1. Structure de la table missions:');
        const missionStructureQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'missions' 
            ORDER BY ordinal_position
        `;
        const missionStructureResult = await pool.query(missionStructureQuery);
        missionStructureResult.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
        });
        
        // 2. Structure de la table mission_tasks
        console.log('\n📋 2. Structure de la table mission_tasks:');
        const missionTasksStructureQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'mission_tasks' 
            ORDER BY ordinal_position
        `;
        const missionTasksStructureResult = await pool.query(missionTasksStructureQuery);
        missionTasksStructureResult.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
        });
        
        // 3. Structure de la table task_assignments
        console.log('\n📋 3. Structure de la table task_assignments:');
        const taskAssignmentsStructureQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'task_assignments' 
            ORDER BY ordinal_position
        `;
        const taskAssignmentsStructureResult = await pool.query(taskAssignmentsStructureQuery);
        taskAssignmentsStructureResult.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
        });
        
        // 4. Exemple de conditions de paiement
        console.log('\n💰 4. Exemple de conditions de paiement:');
        const conditionsQuery = `
            SELECT conditions_paiement, pourcentage_avance
            FROM missions 
            WHERE conditions_paiement IS NOT NULL 
            LIMIT 1
        `;
        const conditionsResult = await pool.query(conditionsQuery);
        if (conditionsResult.rows.length > 0) {
            const conditions = conditionsResult.rows[0];
            console.log('  - Conditions de paiement (JSON):', conditions.conditions_paiement);
            console.log('  - Pourcentage d\'avance:', conditions.pourcentage_avance);
        } else {
            console.log('  - Aucune condition de paiement trouvée');
        }
        
        // 5. Exemple de tâches et affectations
        console.log('\n👥 5. Exemple de tâches et affectations:');
        const tasksQuery = `
            SELECT 
                mt.id as mission_task_id,
                mt.statut as task_statut,
                mt.date_debut,
                mt.date_fin,
                mt.duree_planifiee,
                t.nom as task_nom,
                COUNT(ta.id) as nb_assignments
            FROM mission_tasks mt
            LEFT JOIN tasks t ON mt.task_id = t.id
            LEFT JOIN task_assignments ta ON mt.id = ta.mission_task_id
            GROUP BY mt.id, mt.statut, mt.date_debut, mt.date_fin, mt.duree_planifiee, t.nom
            LIMIT 3
        `;
        const tasksResult = await pool.query(tasksQuery);
        tasksResult.rows.forEach((task, index) => {
            console.log(`  ${index + 1}. Tâche: ${task.task_nom || 'N/A'}`);
            console.log(`     - Statut: ${task.task_statut}`);
            console.log(`     - Date début: ${task.date_debut}`);
            console.log(`     - Date fin: ${task.date_fin}`);
            console.log(`     - Durée planifiée: ${task.duree_planifiee} heures`);
            console.log(`     - Nombre d'affectations: ${task.nb_assignments}`);
        });
        
        // 6. Exemple d'affectations de collaborateurs
        console.log('\n👤 6. Exemple d\'affectations de collaborateurs:');
        const assignmentsQuery = `
            SELECT 
                ta.heures_planifiees,
                ta.taux_horaire,
                ta.statut as assignment_statut,
                c.nom as collaborateur_nom,
                c.prenom as collaborateur_prenom
            FROM task_assignments ta
            LEFT JOIN collaborateurs c ON ta.collaborateur_id = c.id
            LIMIT 3
        `;
        const assignmentsResult = await pool.query(assignmentsQuery);
        assignmentsResult.rows.forEach((assignment, index) => {
            console.log(`  ${index + 1}. ${assignment.collaborateur_prenom} ${assignment.collaborateur_nom}`);
            console.log(`     - Heures planifiées: ${assignment.heures_planifiees}`);
            console.log(`     - Taux horaire: ${assignment.taux_horaire}`);
            console.log(`     - Statut: ${assignment.assignment_statut}`);
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkMissionStructure(); 