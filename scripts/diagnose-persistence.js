const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'eb_vision_2_0',
    password: 'password',
    port: 5432,
});

async function diagnosePersistence() {
    try {
        console.log('🔍 Diagnostic de la persistance des données');
        
        // 1. Vérifier l'utilisateur
        console.log('\n1. Vérification de l\'utilisateur...');
        const userResult = await pool.query(`
            SELECT id, email, collaborateur_id 
            FROM users 
            WHERE email = 'cdjiki@eb-partnersgroup.cm'
        `);
        
        if (userResult.rows.length === 0) {
            console.log('❌ Utilisateur non trouvé');
            return;
        }
        
        const user = userResult.rows[0];
        console.log('✅ Utilisateur trouvé:', user);
        
        // 2. Vérifier le collaborateur
        console.log('\n2. Vérification du collaborateur...');
        const collaborateurResult = await pool.query(`
            SELECT id, nom, prenom 
            FROM collaborateurs 
            WHERE id = $1
        `, [user.collaborateur_id]);
        
        if (collaborateurResult.rows.length === 0) {
            console.log('❌ Collaborateur non trouvé');
            return;
        }
        
        const collaborateur = collaborateurResult.rows[0];
        console.log('✅ Collaborateur trouvé:', collaborateur);
        
        // 3. Vérifier les feuilles de temps
        console.log('\n3. Vérification des feuilles de temps...');
        const timeSheetsResult = await pool.query(`
            SELECT id, date_debut_semaine, date_fin_semaine, statut, total_heures
            FROM time_sheets 
            WHERE collaborateur_id = $1
            ORDER BY date_debut_semaine DESC
            LIMIT 5
        `, [user.collaborateur_id]);
        
        console.log('📊 Feuilles de temps trouvées:', timeSheetsResult.rows.length);
        timeSheetsResult.rows.forEach(ts => {
            console.log(`  - ID: ${ts.id}, Semaine: ${ts.date_debut_semaine} à ${ts.date_fin_semaine}, Statut: ${ts.statut}, Total: ${ts.total_heures}`);
        });
        
        // 4. Vérifier les entrées de temps
        console.log('\n4. Vérification des entrées de temps...');
        const timeEntriesResult = await pool.query(`
            SELECT id, date_saisie, heures, mission_id, task_id, internal_activity_id
            FROM time_entries 
            WHERE user_id = $1
            ORDER BY date_saisie DESC
            LIMIT 10
        `, [user.id]);
        
        console.log('⏰ Entrées de temps trouvées:', timeEntriesResult.rows.length);
        timeEntriesResult.rows.forEach(entry => {
            console.log(`  - ID: ${entry.id}, Date: ${entry.date_saisie}, Heures: ${entry.heures}, Mission: ${entry.mission_id}, Tâche: ${entry.task_id}, Activité: ${entry.internal_activity_id}`);
        });
        
        // 5. Vérifier les missions et tâches
        console.log('\n5. Vérification des missions et tâches...');
        const missionsResult = await pool.query(`
            SELECT id, nom FROM missions LIMIT 5
        `);
        
        console.log('🎯 Missions disponibles:', missionsResult.rows.length);
        missionsResult.rows.forEach(mission => {
            console.log(`  - ID: ${mission.id}, Nom: ${mission.nom}`);
        });
        
        const tasksResult = await pool.query(`
            SELECT id, nom, mission_id FROM tasks LIMIT 5
        `);
        
        console.log('📋 Tâches disponibles:', tasksResult.rows.length);
        tasksResult.rows.forEach(task => {
            console.log(`  - ID: ${task.id}, Nom: ${task.nom}, Mission: ${task.mission_id}`);
        });
        
        // 6. Test d'insertion d'une entrée de temps
        console.log('\n6. Test d\'insertion d\'une entrée de temps...');
        const testDate = '2024-01-15';
        const testEntry = {
            user_id: user.id,
            date_saisie: testDate,
            heures: 8.0,
            mission_id: 1,
            task_id: 1,
            internal_activity_id: null,
            commentaires: 'Test de persistance'
        };
        
        try {
            const insertResult = await pool.query(`
                INSERT INTO time_entries (user_id, date_saisie, heures, mission_id, task_id, internal_activity_id, commentaires)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            `, [testEntry.user_id, testEntry.date_saisie, testEntry.heures, testEntry.mission_id, testEntry.task_id, testEntry.internal_activity_id, testEntry.commentaires]);
            
            console.log('✅ Test d\'insertion réussi, ID:', insertResult.rows[0].id);
            
            // Supprimer l'entrée de test
            await pool.query('DELETE FROM time_entries WHERE id = $1', [insertResult.rows[0].id]);
            console.log('🗑️ Entrée de test supprimée');
            
        } catch (error) {
            console.log('❌ Erreur lors du test d\'insertion:', error.message);
        }
        
        // 7. Vérifier les contraintes
        console.log('\n7. Vérification des contraintes...');
        const constraintsResult = await pool.query(`
            SELECT constraint_name, constraint_type 
            FROM information_schema.table_constraints 
            WHERE table_name = 'time_entries'
        `);
        
        console.log('🔒 Contraintes sur time_entries:');
        constraintsResult.rows.forEach(constraint => {
            console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_type}`);
        });
        
    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error);
    } finally {
        await pool.end();
    }
}

diagnosePersistence(); 