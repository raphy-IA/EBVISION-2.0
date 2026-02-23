const { pool } = require('../src/utils/database');

async function check() {
    try {
        const res = await pool.query("SELECT code, name, nom FROM permissions WHERE code LIKE '%objective%' OR code LIKE '%distribute%' ORDER BY code");
        console.log('\nAVAILABLE PERMISSIONS:');
        res.rows.forEach(r => console.log(`  ${r.code.padEnd(40)} | ${r.name || r.nom}`));
    } catch (e) {
        console.log('ERROR:', e.message);
    }
    process.exit();
}

check();
