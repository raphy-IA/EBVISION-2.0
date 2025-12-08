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
    const client = await pool.connect();
    try {
        console.log('--- Business Units ---');
        const buRes = await client.query('SELECT id, nom FROM business_units ORDER BY nom');
        buRes.rows.forEach(r => console.log(`${r.nom}: ${r.id}`));

        console.log('\n--- Mission Counts per BU ---');
        const countRes = await client.query(`
            SELECT bu.nom, COUNT(m.id) as count
            FROM business_units bu
            LEFT JOIN missions m ON m.business_unit_id = bu.id
            GROUP BY bu.nom
            ORDER BY bu.nom
        `);
        countRes.rows.forEach(r => console.log(`${r.nom}: ${r.count}`));

        console.log('\n--- Missions with NULL BU ---');
        const nullBuRes = await client.query('SELECT count(*) FROM missions WHERE business_unit_id IS NULL');
        console.log(`Count: ${nullBuRes.rows[0].count}`);

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}
check();
