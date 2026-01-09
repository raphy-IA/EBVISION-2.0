const { pool } = require('../src/utils/database');

async function listDuplicates() {
    try {
        const res = await pool.query(`
            SELECT id, category, code, name 
            FROM permissions 
            WHERE category IN ('navigation', 'objectives') 
               OR code LIKE 'menu.%' 
               OR code LIKE 'page.%' 
            ORDER BY code
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

listDuplicates();
