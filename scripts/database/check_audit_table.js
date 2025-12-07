
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function inspect() {
    try {
        const client = await pool.connect();

        // Check if table exists
        const resTable = await client.query("SELECT to_regclass('public.super_admin_audit_log') as exists");
        console.log('Table super_admin_audit_log exists:', resTable.rows[0].exists !== null);

        if (resTable.rows[0].exists) {
            // Check columns
            const resCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'super_admin_audit_log'");
            console.log('Columns:', resCols.rows.map(r => r.column_name));
        }

        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

inspect();
