const { pool } = require('../../src/utils/database');

/**
 * Script pour copier les tâches du type de mission original vers les types dupliqués
 * Corrige l'oubli de la migration initiale
 */

async function copyTasksToNewMissionTypes() {
    const client = await pool.connect();

    try {
        console.log('🔧 Correction: Copie des tâches vers les types dupliqués\n');

        await client.query('BEGIN');

        // 1. Identifier le type original et ses duplicatas
        console.log('📊 Étape 1: Identification des types...\n');

        const typesQuery = await client.query(`
            SELECT id, codification, libelle, business_unit_id
            FROM mission_types
            WHERE codification LIKE 'PE%'
            ORDER BY codification;
        `);

        console.log(`   Trouvé ${typesQuery.rows.length} types "PE":`);
        typesQuery.rows.forEach(type => {
            console.log(`      - ${type.codification}: ${type.libelle}`);
        });

        // Le type original est celui sans suffixe BU (juste "PE")
        const originalType = typesQuery.rows.find(t => t.codification === 'PE');
        const duplicatedTypes = typesQuery.rows.filter(t => t.codification !== 'PE');

        if (!originalType) {
            console.log('\n⚠️  Type original "PE" non trouvé. Recherche d\'un autre type original...');

            // Chercher le type avec le plus de tâches
            const typeWithTasksQuery = await client.query(`
                SELECT mt.id, mt.codification, mt.libelle, COUNT(tmt.id) as task_count
                FROM mission_types mt
                LEFT JOIN task_mission_types tmt ON mt.id = tmt.mission_type_id
                WHERE mt.codification LIKE 'PE%'
                GROUP BY mt.id, mt.codification, mt.libelle
                ORDER BY task_count DESC
                LIMIT 1;
            `);

            if (typeWithTasksQuery.rows.length === 0) {
                throw new Error('Aucun type "PE" trouvé avec des tâches');
            }

            const sourceType = typeWithTasksQuery.rows[0];
            console.log(`   ✓ Type source identifié: ${sourceType.codification} (${sourceType.task_count} tâches)\n`);

            // 2. Récupérer les tâches du type source
            console.log('📝 Étape 2: Récupération des tâches du type source...\n');

            const tasksQuery = await client.query(`
                SELECT 
                    tmt.task_id,
                    tmt.obligatoire,
                    t.code as task_code,
                    t.libelle as task_libelle
                FROM task_mission_types tmt
                JOIN tasks t ON tmt.task_id = t.id
                WHERE tmt.mission_type_id = $1;
            `, [sourceType.id]);

            console.log(`   Trouvé ${tasksQuery.rows.length} tâche(s):`);
            tasksQuery.rows.forEach(task => {
                console.log(`      - ${task.task_code}: ${task.task_libelle} (${task.obligatoire ? 'Obligatoire' : 'Optionnelle'})`);
            });

            if (tasksQuery.rows.length === 0) {
                console.log('\n⚠️  Aucune tâche à copier. Fin du script.\n');
                await client.query('COMMIT');
                return;
            }

            // 3. Copier les tâches vers les types dupliqués
            console.log('\n📋 Étape 3: Copie des tâches vers les types dupliqués...\n');

            const targetTypes = typesQuery.rows.filter(t => t.id !== sourceType.id);

            for (const targetType of targetTypes) {
                console.log(`   🔸 Traitement de: ${targetType.codification}`);

                for (const task of tasksQuery.rows) {
                    // Vérifier si la tâche existe déjà
                    const existingTask = await client.query(`
                        SELECT id FROM task_mission_types
                        WHERE mission_type_id = $1 AND task_id = $2;
                    `, [targetType.id, task.task_id]);

                    if (existingTask.rows.length > 0) {
                        console.log(`      ⊘ Tâche "${task.task_code}" déjà présente, ignorée`);
                        continue;
                    }

                    // Insérer la tâche
                    await client.query(`
                        INSERT INTO task_mission_types (mission_type_id, task_id, obligatoire)
                        VALUES ($1, $2, $3);
                    `, [targetType.id, task.task_id, task.obligatoire]);

                    console.log(`      ✓ Tâche "${task.task_code}" ajoutée (${task.obligatoire ? 'Obligatoire' : 'Optionnelle'})`);
                }
                console.log('');
            }

        } else {
            console.log(`\n   ✓ Type original: ${originalType.codification}`);
            console.log(`   ✓ Types dupliqués: ${duplicatedTypes.length}\n`);

            // 2. Récupérer les tâches du type original
            console.log('📝 Étape 2: Récupération des tâches du type original...\n');

            const tasksQuery = await client.query(`
                SELECT 
                    tmt.task_id,
                    tmt.obligatoire,
                    t.code as task_code,
                    t.libelle as task_libelle
                FROM task_mission_types tmt
                JOIN tasks t ON tmt.task_id = t.id
                WHERE tmt.mission_type_id = $1;
            `, [originalType.id]);

            console.log(`   Trouvé ${tasksQuery.rows.length} tâche(s):`);
            tasksQuery.rows.forEach(task => {
                console.log(`      - ${task.task_code}: ${task.task_libelle} (${task.obligatoire ? 'Obligatoire' : 'Optionnelle'})`);
            });

            if (tasksQuery.rows.length === 0) {
                console.log('\n⚠️  Aucune tâche à copier. Fin du script.\n');
                await client.query('COMMIT');
                return;
            }

            // 3. Copier les tâches vers chaque type dupliqué
            console.log('\n📋 Étape 3: Copie des tâches vers les types dupliqués...\n');

            for (const duplicatedType of duplicatedTypes) {
                console.log(`   🔸 Traitement de: ${duplicatedType.codification}`);

                for (const task of tasksQuery.rows) {
                    // Vérifier si la tâche existe déjà
                    const existingTask = await client.query(`
                        SELECT id FROM task_mission_types
                        WHERE mission_type_id = $1 AND task_id = $2;
                    `, [duplicatedType.id, task.task_id]);

                    if (existingTask.rows.length > 0) {
                        console.log(`      ⊘ Tâche "${task.task_code}" déjà présente, ignorée`);
                        continue;
                    }

                    // Insérer la tâche
                    await client.query(`
                        INSERT INTO task_mission_types (mission_type_id, task_id, obligatoire)
                        VALUES ($1, $2, $3);
                    `, [duplicatedType.id, task.task_id, task.obligatoire]);

                    console.log(`      ✓ Tâche "${task.task_code}" ajoutée (${task.obligatoire ? 'Obligatoire' : 'Optionnelle'})`);
                }
                console.log('');
            }
        }

        // 4. Statistiques finales
        console.log('📊 Statistiques finales:\n');

        const finalStats = await client.query(`
            SELECT 
                mt.codification,
                mt.libelle,
                COUNT(tmt.id) as task_count
            FROM mission_types mt
            LEFT JOIN task_mission_types tmt ON mt.id = tmt.mission_type_id
            WHERE mt.codification LIKE 'PE%'
            GROUP BY mt.id, mt.codification, mt.libelle
            ORDER BY mt.codification;
        `);

        finalStats.rows.forEach(row => {
            console.log(`   ${row.codification}: ${row.task_count} tâche(s)`);
        });

        await client.query('COMMIT');
        console.log('\n✅ Correction terminée avec succès!\n');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Erreur lors de la correction:', error);
        console.error('   Transaction annulée (ROLLBACK)\n');
        throw error;
    } finally {
        client.release();
    }
}

// Exécution
if (require.main === module) {
    copyTasksToNewMissionTypes()
        .then(() => {
            console.log('✅ Script terminé');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Erreur:', error);
            process.exit(1);
        });
}

module.exports = { copyTasksToNewMissionTypes };
