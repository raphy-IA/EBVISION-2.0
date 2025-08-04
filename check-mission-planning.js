const { pool } = require('./src/utils/database');

async function checkMissionPlanning() {
    try {
        console.log('🔍 Vérification du planning de la mission...');
        
        const missionId = 'f1b5a971-3a94-473d-af5b-7922348d8a1d';
        
        // 1. Vérifier les tâches de la mission
        const tasksResult = await pool.query(`
            SELECT 
                mt.id as mission_task_id,
                t.code,
                t.libelle,
                t.description,
                mt.statut,
                mt.duree_planifiee,
                mt.date_debut,
                mt.date_fin,
                mt.notes
            FROM mission_tasks mt
            LEFT JOIN tasks t ON mt.task_id = t.id
            WHERE mt.mission_id = $1
            ORDER BY mt.created_at
        `, [missionId]);
        
        console.log('📋 Tâches de la mission:', JSON.stringify(tasksResult.rows, null, 2));
        
        // 2. Vérifier les affectations de collaborateurs pour chaque tâche
        for (const task of tasksResult.rows) {
            const assignmentsResult = await pool.query(`
                SELECT 
                    ta.id,
                    c.nom,
                    c.prenom,
                    g.nom as grade_nom,
                    g.taux_horaire_default,
                    ta.heures_planifiees,
                    ta.heures_effectuees,
                    ta.taux_horaire,
                    ta.statut
                FROM task_assignments ta
                LEFT JOIN collaborateurs c ON ta.collaborateur_id = c.id
                LEFT JOIN grades g ON c.grade_actuel_id = g.id
                WHERE ta.mission_task_id = $1
            `, [task.mission_task_id]);
            
            console.log(`👥 Affectations pour la tâche "${task.libelle}":`, JSON.stringify(assignmentsResult.rows, null, 2));
        }
        
        // 3. Résumé des heures planifiées
        const summaryResult = await pool.query(`
            SELECT 
                SUM(ta.heures_planifiees) as total_heures_planifiees,
                SUM(ta.heures_effectuees) as total_heures_effectuees,
                COUNT(DISTINCT ta.collaborateur_id) as nombre_collaborateurs,
                COUNT(DISTINCT mt.id) as nombre_taches
            FROM task_assignments ta
            LEFT JOIN mission_tasks mt ON ta.mission_task_id = mt.id
            WHERE mt.mission_id = $1
        `, [missionId]);
        
        console.log('📊 Résumé du planning:', JSON.stringify(summaryResult.rows[0], null, 2));
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkMissionPlanning(); 