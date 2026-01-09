const { pool } = require('../src/utils/database');

async function debugObjectives() {
    try {
        const objectives = await pool.query("SELECT id, code, name, category FROM permissions WHERE name ILIKE '%objective%' OR code ILIKE '%objective%' ORDER BY code");
        console.log('--- OBJECTIVES PERMISSIONS ---');
        console.log(JSON.stringify(objectives.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

debugObjectives();
