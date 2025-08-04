const { pool } = require('../src/utils/database');

async function analyzeMissionDataStorage() {
    try {
        console.log('🔍 Analyse détaillée du stockage des données de mission...');
        
        // 1. Conditions de paiement
        console.log('\n💰 1. CONDITIONS DE PAIEMENT:');
        console.log('   Stockage: Champ TEXT dans la table missions');
        console.log('   Format: JSON stringifié');
        console.log('   Structure:');
        console.log('   {');
        console.log('     "pourcentage_honoraires": 30,');
        console.log('     "montant_honoraires": 18000,');
        console.log('     "pourcentage_debours": 50,');
        console.log('     "montant_debours": 7500,');
        console.log('     "date": "2025-08-20",');
        console.log('     "details": "Acompte initial"');
        console.log('   }');
        
        // Exemple réel de conditions de paiement
        const conditionsQuery = `
            SELECT conditions_paiement, pourcentage_avance
            FROM missions 
            WHERE conditions_paiement IS NOT NULL 
            LIMIT 1
        `;
        const conditionsResult = await pool.query(conditionsQuery);
        if (conditionsResult.rows.length > 0) {
            const conditions = conditionsResult.rows[0];
            console.log('\n   📊 Exemple réel:');
            console.log(`   - Conditions: ${conditions.conditions_paiement}`);
            console.log(`   - Pourcentage avance: ${conditions.pourcentage_avance}%`);
        }
        
        // 2. Planification des collaborateurs sur les tâches
        console.log('\n👥 2. PLANIFICATION DES COLLABORATEURS SUR LES TÂCHES:');
        console.log('   Structure:');
        console.log('   - Table: mission_tasks (tâches de la mission)');
        console.log('   - Table: task_assignments (affectations des collaborateurs)');
        console.log('   - Relation: mission_tasks.id -> task_assignments.mission_task_id');
        
        // Exemple de mission avec tâches et affectations
        console.log('\n   📋 Exemple de mission avec tâches:');
        const missionWithTasksQuery = `
            SELECT 
                m.code as mission_code,
                m.nom as mission_nom,
                mt.id as task_id,
                mt.statut as task_statut,
                mt.date_debut,
                mt.date_fin,
                mt.duree_planifiee,
                t.libelle as task_libelle,
                COUNT(ta.id) as nb_assignments
            FROM missions m
            LEFT JOIN mission_tasks mt ON m.id = mt.mission_id
            LEFT JOIN tasks t ON mt.task_id = t.id
            LEFT JOIN task_assignments ta ON mt.id = ta.mission_task_id
            WHERE m.code LIKE 'TEST-MISSION%'
            GROUP BY m.code, m.nom, mt.id, mt.statut, mt.date_debut, mt.date_fin, mt.duree_planifiee, t.libelle
            ORDER BY m.code DESC
            LIMIT 3
        `;
        const missionWithTasksResult = await pool.query(missionWithTasksQuery);
        missionWithTasksResult.rows.forEach((mission, index) => {
            console.log(`   ${index + 1}. Mission: ${mission.mission_code} - ${mission.mission_nom}`);
            console.log(`      Tâche: ${mission.task_libelle || 'N/A'}`);
            console.log(`      - Statut: ${mission.task_statut}`);
            console.log(`      - Date début: ${mission.date_debut}`);
            console.log(`      - Date fin: ${mission.date_fin}`);
            console.log(`      - Durée planifiée: ${mission.duree_planifiee} heures`);
            console.log(`      - Nombre d'affectations: ${mission.nb_assignments}`);
        });
        
        // Exemple d'affectations détaillées
        console.log('\n   👤 Exemple d\'affectations détaillées:');
        const assignmentsQuery = `
            SELECT 
                ta.heures_planifiees,
                ta.heures_effectuees,
                ta.taux_horaire,
                ta.statut as assignment_statut,
                c.nom as collaborateur_nom,
                c.prenom as collaborateur_prenom,
                t.libelle as task_libelle,
                m.code as mission_code
            FROM task_assignments ta
            LEFT JOIN mission_tasks mt ON ta.mission_task_id = mt.id
            LEFT JOIN tasks t ON mt.task_id = t.id
            LEFT JOIN missions m ON mt.mission_id = m.id
            LEFT JOIN collaborateurs c ON ta.collaborateur_id = c.id
            LIMIT 5
        `;
        const assignmentsResult = await pool.query(assignmentsQuery);
        assignmentsResult.rows.forEach((assignment, index) => {
            console.log(`   ${index + 1}. ${assignment.collaborateur_prenom} ${assignment.collaborateur_nom}`);
            console.log(`      - Mission: ${assignment.mission_code || 'N/A'}`);
            console.log(`      - Tâche: ${assignment.task_libelle || 'N/A'}`);
            console.log(`      - Heures planifiées: ${assignment.heures_planifiees}`);
            console.log(`      - Heures effectuées: ${assignment.heures_effectuees}`);
            console.log(`      - Taux horaire: ${assignment.taux_horaire}`);
            console.log(`      - Statut: ${assignment.assignment_statut}`);
        });
        
        // 3. Résumé du processus d'enregistrement
        console.log('\n📝 3. PROCESSUS D\'ENREGISTREMENT:');
        console.log('   A. Création de la mission:');
        console.log('      - INSERT INTO missions (conditions_paiement, pourcentage_avance, ...)');
        console.log('      - conditions_paiement: JSON.stringify([{...}])');
        console.log('      - pourcentage_avance: numeric');
        console.log('');
        console.log('   B. Création des tâches:');
        console.log('      - INSERT INTO mission_tasks (mission_id, task_id, date_debut, date_fin, duree_planifiee)');
        console.log('      - Chaque tâche est liée à la mission');
        console.log('');
        console.log('   C. Affectation des collaborateurs:');
        console.log('      - INSERT INTO task_assignments (mission_task_id, collaborateur_id, heures_planifiees, taux_horaire)');
        console.log('      - Chaque affectation est liée à une tâche de mission');
        console.log('');
        console.log('   D. Relations:');
        console.log('      missions -> mission_tasks -> task_assignments');
        console.log('      missions -> collaborateurs (responsable)');
        console.log('      missions -> users (associé)');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

analyzeMissionDataStorage(); 