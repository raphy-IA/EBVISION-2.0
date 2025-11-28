const { pool } = require('../src/utils/database');

async function check() {
    try {
        console.log('Checking permissions for parametres_administration...');
        const res = await pool.query("SELECT code FROM permissions WHERE code LIKE '%param%administration%' ORDER BY code");
        res.rows.forEach(r => console.log(r.code));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
