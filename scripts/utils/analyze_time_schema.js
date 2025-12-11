require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');

async function analyze() {
    console.log('🔍 Analyzing Time Entries Database Schema...\n');
    const client = await pool.connect();

    try {
        // 1. Time Entries table columns
        console.log('--- TIME_ENTRIES Columns ---');
        const teCols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'time_entries'
            ORDER BY ordinal_position
        `);
        teCols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

        // 2. Check existing time entries count
        console.log('\n--- Existing Time Entries ---');
        const teCount = await client.query('SELECT COUNT(*) FROM time_entries');
        console.log(`  Total: ${teCount.rows[0].count}`);

        // Sample
        const teSample = await client.query('SELECT * FROM time_entries LIMIT 2');
        console.log('  Sample:', JSON.stringify(teSample.rows, null, 2));

        // 3. Mission Tasks table
        console.log('\n--- MISSION_TASKS Columns ---');
        const mtCols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'mission_tasks'
            ORDER BY ordinal_position
        `);
        mtCols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

        // 4. Equipes Mission (Planning)
        console.log('\n--- EQUIPES_MISSION Columns ---');
        const eqCols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'equipes_mission'
            ORDER BY ordinal_position
        `);
        eqCols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

        // 5. Internal Activities
        console.log('\n--- Internal Activities Tables ---');
        const iaTables = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_name LIKE '%internal%' OR table_name LIKE '%activit%'
        `);
        console.log('  Tables:', iaTables.rows.map(r => r.table_name));

        // Check bu_internal_activities
        const iaCols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'bu_internal_activities'
            ORDER BY ordinal_position
        `);
        if (iaCols.rows.length > 0) {
            console.log('\n--- BU_INTERNAL_ACTIVITIES Columns ---');
            iaCols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
        }

        // 6. Sample of GT tasks linked to missions
        console.log('\n--- Sample Mission Tasks (GT) ---');
        const mtSample = await client.query(`
            SELECT mt.id, mt.mission_id, t.code, m.nom as mission, c.nom as client
            FROM mission_tasks mt
            JOIN tasks t ON mt.task_id = t.id
            JOIN missions m ON mt.mission_id = m.id
            LEFT JOIN clients c ON m.client_id = c.id
            WHERE t.code = 'GT'
            LIMIT 5
        `);
        console.log(mtSample.rows);

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}

analyze();
