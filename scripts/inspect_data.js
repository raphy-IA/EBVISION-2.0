const { pool } = require('../src/utils/database');

async function inspectData() {
    try {
        const query = `SELECT id, code, unit, default_unit_id FROM objective_types LIMIT 5`;
        const res = await pool.query(query);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

inspectData();
