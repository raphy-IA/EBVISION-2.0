const { pool } = require('../src/utils/database');

async function checkSchema() {
    try {
        const res = await pool.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_name IN ('opportunities', 'missions', 'invoices', 'customers', 'clients') 
            ORDER BY table_name, column_name
        `);

        const schema = {};
        res.rows.forEach(row => {
            if (!schema[row.table_name]) {
                schema[row.table_name] = [];
            }
            schema[row.table_name].push(row.column_name);
        });

        console.log(JSON.stringify(schema, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkSchema();
