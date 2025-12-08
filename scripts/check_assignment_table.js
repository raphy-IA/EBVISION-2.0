require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function check() {
    try {
        console.log("Checking tables...");
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%assign%';
        `);
        console.table(res.rows);

        if (res.rows.length > 0) {
            const tableName = res.rows[0].table_name;
            console.log(`Checking columns for ${tableName}...`);
            const cols = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '${tableName}';
            `);
            console.table(cols.rows);
        }
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

check();
