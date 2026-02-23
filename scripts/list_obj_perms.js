const { pool } = require('../src/utils/database');

async function list() {
    try {
        const res = await pool.query("SELECT code, name FROM permissions WHERE code LIKE 'objectives%' OR name ILIKE '%objectif%' ORDER BY code");
        console.log('--- CODES ---');
        res.rows.forEach(r => console.log(r.code));
        console.log('--- NAMES ---');
        res.rows.forEach(r => console.log(r.name));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit();
    }
}

list();
