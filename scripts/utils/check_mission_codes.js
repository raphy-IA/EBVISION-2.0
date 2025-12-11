require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');

async function check() {
    try {
        const res = await pool.query(`
            SELECT code, nom 
            FROM missions 
            WHERE code IS NOT NULL AND code != 'N/A' 
            ORDER BY code DESC 
            LIMIT 15
        `);
        console.log('Existing Mission Codes:');
        res.rows.forEach(r => console.log(`  ${r.code}: ${r.nom.substring(0, 50)}...`));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
