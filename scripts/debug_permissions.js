const { pool } = require('../src/utils/database');

async function debugPermissions() {
    try {
        const objectives = await pool.query("SELECT id, code, name, category, created_at FROM permissions WHERE name ILIKE '%objective%' OR code ILIKE '%objective%' ORDER BY code");
        console.log('--- OBJECTIVES PERMISSIONS ---');
        console.log(JSON.stringify(objectives.rows, null, 2));

        const collabs = await pool.query("SELECT id, code, name, category FROM permissions WHERE name ILIKE '%collaborateur%' OR code ILIKE '%collaborateur%' ORDER BY code");
        console.log('--- COLLABORATOR PERMISSIONS ---');
        console.log(JSON.stringify(collabs.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

debugPermissions();
