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
        const res = await pool.query(`
            SELECT 
                COALESCE(b.nom, 'N/A') as bu, 
                COALESCE(d.nom, 'N/A') as division, 
                count(m.id) as missions 
            FROM missions m 
            LEFT JOIN business_units b ON m.business_unit_id = b.id 
            LEFT JOIN divisions d ON m.division_id = d.id 
            GROUP BY b.nom, d.nom 
            ORDER BY 1, 2;
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

check();
