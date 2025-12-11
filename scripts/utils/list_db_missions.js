require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');

async function listMissions() {
    try {
        console.log('Listing missions (Name | Client | BU)...');
        const res = await pool.query(`
            SELECT m.id, m.nom, c.nom as client, bu.nom as bu 
            FROM missions m 
            LEFT JOIN clients c ON m.client_id = c.id
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            ORDER BY m.nom
            LIMIT 20
        `);
        res.rows.forEach(r => console.log(`${r.nom} | ${r.client} | ${r.bu}`));

        const count = await pool.query('SELECT count(*) FROM missions');
        console.log('Total missions:', count.rows[0].count);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
listMissions();
