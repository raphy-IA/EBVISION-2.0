const { pool } = require('../src/utils/database');

async function inspectSchema() {
    try {
        const query = `
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'objective_types';
        `;
        const res = await pool.query(query);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

inspectSchema();
