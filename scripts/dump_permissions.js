const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

async function dumpPermissions() {
    try {
        const res = await pool.query(`
            SELECT category, code, name 
            FROM permissions 
            WHERE category = 'dashboard'
            ORDER BY code
        `);
        console.log('Category | Code | Name');
        console.log('--- | --- | ---');
        res.rows.forEach(r => console.log(`${r.category} | ${r.code} | ${r.name}`));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

dumpPermissions();
