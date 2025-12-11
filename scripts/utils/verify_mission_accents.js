require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');

async function verify() {
    try {
        console.log('Verifying accents in missions...');
        const res = await pool.query(`
            SELECT nom, client_id 
            FROM missions 
            WHERE nom ILIKE '%séminaire%' 
               OR nom ILIKE '%contrôle%' 
               OR nom ILIKE '%évaluation%'
            LIMIT 10
        `);

        console.log(`Found ${res.rows.length} matches:`);
        res.rows.forEach(r => console.log(` - ${r.nom}`));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
verify();
