require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');

async function check() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'internal_activities'
            ORDER BY ordinal_position
        `);
        console.log('internal_activities columns:');
        res.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

        // Sample data
        const sample = await pool.query('SELECT * FROM internal_activities LIMIT 3');
        console.log('\nSample data:', sample.rows);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
