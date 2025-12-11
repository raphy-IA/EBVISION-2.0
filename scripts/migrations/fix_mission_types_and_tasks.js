require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');

const PE_TYPE_ID = '21b59685-a2aa-4ba5-abf4-efc0e946bd9b'; // PREVIOUS ENGAGEMENT
const GT_TASK_ID = 'fd8f0984-6883-4222-9c21-a7bbab4038a0'; // GT Task (Global)

async function fixTypesAndTasks() {
    console.log('🚀 Fixing Mission Types and Linking GT Task...');
    const client = await pool.connect();

    try {
        // 1. Get all missions
        const res = await client.query('SELECT id, nom, mission_type_id, collaborateur_id, manager_id, associe_id FROM missions');
        const missions = res.rows;
        console.log(`Processing ${missions.length} missions...`);

        let updatedType = 0;
        let linkedTasks = 0;
        let personnelSample = { resp: 0, man: 0, assoc: 0 };

        for (const m of missions) {
            // Stats for personnel
            if (m.collaborateur_id) personnelSample.resp++;
            if (m.manager_id) personnelSample.man++;
            if (m.associe_id) personnelSample.assoc++;

            // A. Update Mission Type if needed
            if (m.mission_type_id !== PE_TYPE_ID) {
                await client.query(`
                    UPDATE missions 
                    SET mission_type_id = $1, type_mission = 'PREVIOUS ENGAGEMENT' 
                    WHERE id = $2
                `, [PE_TYPE_ID, m.id]);
                updatedType++;
            }

            // B. Check/Link 'GT' Task via mission_tasks table
            const mtRes = await client.query(`
                SELECT id FROM mission_tasks 
                WHERE mission_id = $1 AND task_id = $2
            `, [m.id, GT_TASK_ID]);

            if (mtRes.rows.length === 0) {
                // Link GT task
                await client.query(`
                    INSERT INTO mission_tasks (
                        mission_id, 
                        task_id, 
                        statut, 
                        duree_planifiee, 
                        duree_reelle
                    ) VALUES ($1, $2, 'PLANIFIEE', 0, 0)
                `, [m.id, GT_TASK_ID]);
                linkedTasks++;
            }
        }

        console.log(`\n✅ Mission Types Updated: ${updatedType}`);
        console.log(`✅ GT Tasks Linked: ${linkedTasks}`);
        console.log(`\nℹ️ Personnel Data Found in DB:`);
        console.log(`   - Missions with Responsable: ${personnelSample.resp}`);
        console.log(`   - Missions with Manager: ${personnelSample.man}`);
        console.log(`   - Missions with Associé: ${personnelSample.assoc}`);

    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}

fixTypesAndTasks();
