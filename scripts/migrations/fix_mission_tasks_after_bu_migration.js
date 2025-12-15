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

async function fixMissionTasks(analysisOnly = false) {
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
                m.code as mission_code,
                m.mission_type_id,
                mt_type.codification as type_code,
                mt_type.libelle as type_libelle,
                COUNT(DISTINCT mt.id) as nb_mission_tasks,
                COUNT(DISTINCT tmt.task_id) as nb_type_tasks
            FROM missions m
            LEFT JOIN mission_types mt_type ON m.mission_type_id = mt_type.id
            LEFT JOIN mission_tasks mt ON m.id = mt.mission_id
            LEFT JOIN task_mission_types tmt ON tmt.mission_type_id = m.mission_type_id
            WHERE m.mission_type_id IS NOT NULL
            GROUP BY m.id, m.nom, m.code, m.mission_type_id, mt_type.codification, mt_type.libelle
            HAVING COUNT(DISTINCT mt.id) != COUNT(DISTINCT tmt.task_id)
            ORDER BY m.nom;
        `;

        const analysis = await client.query(analysisQuery);

        console.log(`   Missions avec problème de tâches: ${analysis.rows.length}`);

        if (analysis.rows.length === 0) {
            console.log('\n✅ Aucune mission à corriger!');
            await client.query('COMMIT');
            return;
        }

        console.log('\n   📋 Détails des missions à corriger:\n');
        analysis.rows.forEach((row, index) => {
            console.log(`   ${index + 1}. ${row.mission_nom} (${row.mission_code})`);
            console.log(`      Type: ${row.type_code} - ${row.type_libelle}`);
            console.log(`      Mission tasks actuelles: ${row.nb_mission_tasks}`);
            console.log(`      Type tasks attendues: ${row.nb_type_tasks}`);
            console.log('');
        });

        console.log('   ' + '─'.repeat(58));
        console.log(`   Total: ${analysis.rows.length} mission(s) à corriger\n`);

        // Si mode analyse seulement, arrêter ici
        if (analysisOnly) {
            console.log('ℹ️  Mode analyse seulement - Aucune modification effectuée');
            await client.query('ROLLBACK');
            return;
        }

        // 2. Pour chaque mission problématique, recréer les mission_tasks
        console.log('\n📝 Étape 2: Correction des mission_tasks...\n');

        let fixedCount = 0;

        for (const mission of analysis.rows) {
            console.log(`   🔸 ${mission.mission_nom} (${mission.mission_code})`);

            // Supprimer les mission_tasks existantes
            await client.query(
                'DELETE FROM mission_tasks WHERE mission_id = $1',
                [mission.mission_id]
            );

            // Récupérer les tâches du type de mission actuel via task_mission_types
            const tasksQuery = `
                SELECT t.id, t.code, t.libelle, tmt.obligatoire
                FROM tasks t
                INNER JOIN task_mission_types tmt ON t.id = tmt.task_id
                WHERE tmt.mission_type_id = $1 AND t.actif = true
                ORDER BY tmt.ordre, t.code
            `;

            const tasks = await client.query(tasksQuery, [mission.mission_type_id]);

            // Créer les mission_tasks
            for (const task of tasks.rows) {
                await client.query(`
                    INSERT INTO mission_tasks (
                        mission_id, task_id, statut
                    ) VALUES ($1, $2, $3)
                `, [mission.mission_id, task.id, 'PLANIFIEE']);

                console.log(`      ✓ Tâche "${task.code}" ajoutée${task.obligatoire ? ' (obligatoire)' : ''}`);
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
const analysisOnly = process.argv.includes('--analyse') || process.argv.includes('--analysis');

if (analysisOnly) {
    console.log('🔍 Mode ANALYSE SEULEMENT\n');
}

fixMissionTasks(analysisOnly)
    .then(() => {
        console.log('\n✅ Script terminé');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Erreur fatale:', error);
        process.exit(1);
    });
