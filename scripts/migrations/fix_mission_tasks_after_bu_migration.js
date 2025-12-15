/**
 * Script pour corriger les mission_tasks après la migration des types de mission
 * 
 * Problème: Après la duplication des types de mission, les missions existantes
 * ont toujours leurs mission_tasks qui pointent vers les tâches de l'ancien type.
 * 
 * Solution: Pour chaque mission, vérifier que ses mission_tasks correspondent
 * aux tâches de son mission_type_id actuel.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ebvision',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
});

async function fixMissionTasks() {
    const client = await pool.connect();

    try {
        console.log('🔧 Correction des mission_tasks après migration BU\n');
        console.log('='.repeat(60));

        await client.query('BEGIN');

        // 1. Analyser la situation
        console.log('\n📊 Étape 1: Analyse de la situation...\n');

        const analysisQuery = `
            SELECT 
                m.id as mission_id,
                m.nom as mission_nom,
                m.mission_type_id,
                mt_type.codification as type_code,
                mt_type.libelle as type_libelle,
                COUNT(DISTINCT mt.id) as nb_mission_tasks,
                COUNT(DISTINCT t.id) as nb_type_tasks
            FROM missions m
            LEFT JOIN mission_types mt_type ON m.mission_type_id = mt_type.id
            LEFT JOIN mission_tasks mt ON m.id = mt.mission_id
            LEFT JOIN tasks t ON t.mission_type_id = m.mission_type_id
            WHERE m.mission_type_id IS NOT NULL
            GROUP BY m.id, m.nom, m.mission_type_id, mt_type.codification, mt_type.libelle
            HAVING COUNT(DISTINCT mt.id) != COUNT(DISTINCT t.id)
            ORDER BY m.nom;
        `;

        const analysis = await client.query(analysisQuery);

        console.log(`   Missions avec problème de tâches: ${analysis.rows.length}`);

        if (analysis.rows.length === 0) {
            console.log('\n✅ Aucune mission à corriger!');
            await client.query('COMMIT');
            return;
        }

        console.log('\n   Détails:');
        analysis.rows.forEach(row => {
            console.log(`   - ${row.mission_nom} (${row.type_code})`);
            console.log(`     Mission tasks: ${row.nb_mission_tasks}, Type tasks: ${row.nb_type_tasks}`);
        });

        // 2. Pour chaque mission problématique, recréer les mission_tasks
        console.log('\n📝 Étape 2: Correction des mission_tasks...\n');

        let fixedCount = 0;

        for (const mission of analysis.rows) {
            console.log(`   🔸 ${mission.mission_nom}`);

            // Supprimer les mission_tasks existantes
            await client.query(
                'DELETE FROM mission_tasks WHERE mission_id = $1',
                [mission.mission_id]
            );

            // Récupérer les tâches du type de mission actuel
            const tasksQuery = `
                SELECT id, code, libelle, obligatoire
                FROM tasks
                WHERE mission_type_id = $1
                ORDER BY code
            `;

            const tasks = await client.query(tasksQuery, [mission.mission_type_id]);

            // Créer les mission_tasks
            for (const task of tasks.rows) {
                await client.query(`
                    INSERT INTO mission_tasks (
                        mission_id, task_id, statut
                    ) VALUES ($1, $2, $3)
                `, [mission.mission_id, task.id, 'PLANIFIEE']);

                console.log(`      ✓ Tâche "${task.code}" ajoutée`);
            }

            fixedCount++;
        }

        await client.query('COMMIT');

        console.log('\n' + '='.repeat(60));
        console.log(`\n✅ Correction terminée!`);
        console.log(`   Missions corrigées: ${fixedCount}`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Erreur:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécution
fixMissionTasks()
    .then(() => {
        console.log('\n✅ Script terminé');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Erreur fatale:', error);
        process.exit(1);
    });
