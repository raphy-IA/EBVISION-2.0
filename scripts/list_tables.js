const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function inspectDatabase() {
    try {
        console.log("--- SCHEMAS ---");
        const schemas = await pool.query("SELECT schema_name FROM information_schema.schemata");
        schemas.rows.forEach(r => console.log(r.schema_name));

        console.log("\n--- TABLES (All Schemas) ---");
        const tables = await pool.query(`
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
            ORDER BY table_schema, table_name
        `);
        tables.rows.forEach(r => console.log(`${r.table_schema}.${r.table_name}`));

    } catch (err) {
        console.error('Error executing query', err);
    } finally {
        await pool.end();
    }
}

inspectDatabase();
