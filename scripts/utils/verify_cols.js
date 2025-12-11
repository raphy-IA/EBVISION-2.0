const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'EB-Vision 2.0',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function check() {
    try {
        console.log('Checking columns in clients table...');
        console.log(`Connecting to ${process.env.DB_NAME} on ${process.env.DB_HOST}`);
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'clients'
            AND column_name IN ('administrateur_nom', 'contact_interne_nom', 'notes')
        `);
        console.log('Found columns:', res.rows.map(r => r.column_name));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
