const { pool } = require('../src/utils/database');

async function checkSchema() {
    try {
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'business_unit_objectives'");
        console.log('Columns in business_unit_objectives:', res.rows.map(r => r.column_name));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

checkSchema();
