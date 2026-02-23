const { pool } = require('../src/utils/database');

async function listAllTables() {
    try {
        console.log('--- TOUTES LES TABLES ---');
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        res.rows.forEach(r => console.log(r.table_name));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit();
    }
}

listAllTables();
