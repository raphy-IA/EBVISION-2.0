require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');

async function inspect() {
    console.log('Inspecting Mission EB--25-193...');
    try {
        const res = await pool.query(`
            SELECT 
                m.id, m.code, m.nom, 
                c.nom as client, 
                bu.nom as bu, 
                d.nom as division
            FROM missions m 
            LEFT JOIN clients c ON m.client_id = c.id
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            LEFT JOIN divisions d ON m.division_id = d.id
            WHERE m.code = 'EB--25-193'
        `);

        if (res.rows.length > 0) {
            console.log(res.rows[0]);
        } else {
            console.log('Mission not found by code.');
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
inspect();
