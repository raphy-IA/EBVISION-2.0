require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function run() {
    const client = await pool.connect();
    try {
        const cols = ['code', 'conditions_paiement', 'fiscal_year_id', 'mission_type_id', 'responsable_id', 'collaborateur_id'];
        const res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'missions' AND column_name = ANY($1)`, [cols]);
        console.log("FOUND COLUMNS:", res.rows.map(r => r.column_name).join(', '));
    } catch (e) { console.error(e); }
    finally { client.release(); pool.end(); }
}
run();
