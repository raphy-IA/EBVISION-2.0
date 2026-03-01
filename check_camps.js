const { pool } = require('./src/utils/database');
async function test() {
    try {
        for (const table of ['evaluation_campaigns', 'prospecting_campaigns']) {
            const query = "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 AND data_type IN ('date', 'timestamp without time zone', 'timestamp with time zone');";
            const res = await pool.query(query, [table]);
            console.log(table, res.rows.map(r => r.column_name));
        }
    } catch (e) { console.error(e) }
    process.exit();
}
test();
