
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function run() {
    try {
        const client = await pool.connect();
        const sql = fs.readFileSync(path.join(__dirname, '../../migrations/004_create_super_admin_audit_log.sql'), 'utf8');
        console.log('Running SQL...');
        await client.query(sql);
        console.log('Success!');
        client.release();
    } catch (e) {
        console.error('Error:', e.message);
        console.error('Code:', e.code);
    } finally {
        pool.end();
    }
}

run();
