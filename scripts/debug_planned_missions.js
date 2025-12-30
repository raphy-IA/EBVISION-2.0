const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function main() {
    const client = await pool.connect();
    try {
        console.log('--- Checking Latest Mission ---');
        // Get the most recently created mission
        const missionsRes = await client.query(`
            SELECT m.id, m.nom, m.code, m.statut, m.created_at, 
                   m.collaborateur_id as resp_id, m.manager_id, m.associe_id
            FROM missions m
            ORDER BY m.created_at DESC 
            LIMIT 1
        `);

        if (missionsRes.rows.length === 0) {
            console.log('No missions found.');
            return;
        }

        const mission = missionsRes.rows[0];
        console.log('Latest Mission:', JSON.stringify(mission, null, 2));

        console.log('\n--- Checking Assignments for this Mission ---');
        const assignmentsRes = await client.query(`
            SELECT ta.id, ta.statut as assign_status, 
                   c.nom, c.prenom, c.user_id, 
                   mt.id as task_id, mt.statut as task_status
            FROM task_assignments ta
            JOIN mission_tasks mt ON ta.mission_task_id = mt.id
            JOIN collaborateurs c ON ta.collaborateur_id = c.id
            WHERE mt.mission_id = $1
        `, [mission.id]);

        if (assignmentsRes.rows.length === 0) {
            console.log('No assignments found for this mission.');
        } else {
            assignmentsRes.rows.forEach(r => {
                console.log(`User: ${r.prenom} ${r.nom} (ID: ${r.user_id}) - Task Status: ${r.task_status} - Assign Status: ${r.assign_status}`);
            });
        }

        console.log('\n--- Simulation of /planned query ---');
        // We need a user_id to test. Let's pick one from the assignments if any, or the mission creator/responsible if we can find their user_id.
        let userIdToTest = null;
        if (assignmentsRes.rows.length > 0) {
            userIdToTest = assignmentsRes.rows[0].user_id;
        } else {
            console.log('No assigned users to test /planned query with.');
            // Try to find the user_id of the responsible
            if (mission.resp_id) {
                const respRes = await client.query('SELECT user_id FROM collaborateurs WHERE id = $1', [mission.resp_id]);
                if (respRes.rows.length > 0) userIdToTest = respRes.rows[0].user_id;
            }
        }

        if (userIdToTest) {
            console.log(`Testing with User ID: ${userIdToTest}`);
            const plannedQuery = `
                SELECT DISTINCT 
                    m.id, m.nom
                FROM missions m
                JOIN mission_tasks mt ON m.id = mt.mission_id
                JOIN task_assignments ta ON mt.id = ta.mission_task_id
                JOIN collaborateurs col ON ta.collaborateur_id = col.id
                WHERE col.user_id = $1
                AND m.statut IN ('EN_COURS', 'PLANIFIEE')
                AND m.id = $2
            `;
            const res = await client.query(plannedQuery, [userIdToTest, mission.id]);
            if (res.rows.length > 0) {
                console.log('SUCCESS: Mission found in /planned query for this user.');
            } else {
                console.log('FAILURE: Mission NOT found in /planned query for this user.');
                // Debug why
                if (mission.statut !== 'EN_COURS' && mission.statut !== 'PLANIFIEE') {
                    console.log(`Reason: Mission status is '${mission.statut}' (expected EN_COURS or PLANIFIEE)`);
                }
            }
        } else {
            console.log('No user ID available to test.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
