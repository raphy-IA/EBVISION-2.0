require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');

async function check() {
    try {
        console.log('Checking columns in missions table...');
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'missions'
        `);
        console.log('Columns:', res.rows.map(r => r.column_name).sort());
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
