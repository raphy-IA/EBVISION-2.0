require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');

async function diagnose() {
    console.log('🔎 Diagnosing Personnel and Mission Type Issues...\n');
    const client = await pool.connect();

    try {
        // 1. Check Mission Type Distribution
        console.log('--- Mission Type Distribution ---');
        const typeRes = await client.query(`
            SELECT type_mission, COUNT(*) as cnt
            FROM missions
            GROUP BY type_mission
            ORDER BY cnt DESC
        `);
        console.log(typeRes.rows);

        // 2. Check FKs for Missions (Personnel IDs)
        console.log('\n--- Sample Missions with Personnel IDs ---');
        const sampleRes = await client.query(`
            SELECT m.nom, m.collaborateur_id, m.manager_id, m.associe_id
            FROM missions m
            WHERE m.collaborateur_id IS NOT NULL OR m.manager_id IS NOT NULL OR m.associe_id IS NOT NULL
            LIMIT 5
        `);
        console.log(sampleRes.rows);

        // 3. Check if Collaborateurs table exists and has UUIDs
        console.log('\n--- Checking Collaborateurs Table ---');
        const collabRes = await client.query(`
            SELECT column_name FROM information_schema.columns WHERE table_name = 'collaborateurs'
        `);
        console.log('Collaborateurs Columns:', collabRes.rows.map(r => r.column_name));

        // 4. Verify Join: Does a sample collaborateur_id exist in users?
        if (sampleRes.rows.length > 0 && sampleRes.rows[0].collaborateur_id) {
            const testId = sampleRes.rows[0].collaborateur_id;
            console.log(`\n--- Testing ID ${testId} in both tables ---`);

            const inUsers = await client.query('SELECT id, nom, prenom FROM users WHERE id = $1', [testId]);
            console.log('In Users:', inUsers.rows);

            const inCollab = await client.query('SELECT id, nom, prenom FROM collaborateurs WHERE id = $1', [testId]);
            console.log('In Collaborateurs:', inCollab.rows);
        }

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}

diagnose();
