require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');

async function check() {
    console.log('Inspecting Task Tables...');
    try {
        // 1. Find tables
        const tablesRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name LIKE '%task%' OR table_name LIKE '%mission%'
        `);
        console.log('Tables found:', tablesRes.rows.map(r => r.table_name));

        // 2. Check tasks columns
        const colsRes = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'tasks'
        `);
        console.log('Tasks Columns:', colsRes.rows.map(r => r.column_name));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
