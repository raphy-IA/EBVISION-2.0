const { pool } = require('../src/utils/database');

async function getFY26() {
    const client = await pool.connect();
    try {
        const res = await client.query("SELECT * FROM fiscal_years WHERE libelle = 'FY26';");
        console.log(JSON.stringify(res.rows[0], null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        client.release();
        pool.end();
    }
}

getFY26();
