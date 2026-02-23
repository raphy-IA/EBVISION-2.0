const { pool } = require('../src/utils/database');

async function checkSchema() {
    try {
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'fiscal_years'");
        console.log('Columns in fiscal_years:', res.rows.map(r => r.column_name));

        const res2 = await pool.query("SELECT * FROM fiscal_years LIMIT 1");
        console.log('Sample row from fiscal_years:', res2.rows[0]);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

checkSchema();
