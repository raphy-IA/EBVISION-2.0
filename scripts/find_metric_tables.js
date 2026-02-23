const { pool } = require('../src/utils/database');

async function listMetricTables() {
    try {
        console.log('--- TABLES RELIÉES AUX MÉTRIQUES ---');
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name ILIKE '%metric%'
        `);

        if (res.rows.length === 0) {
            console.log('Aucune table trouvée avec "metric" dans le nom.');
        } else {
            res.rows.forEach(r => console.log(`- ${r.table_name}`));
        }

        console.log('\n--- TABLES RELIÉES AUX OBJECTIFS (POUR CONTEXTE) ---');
        const resObj = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name ILIKE '%objective%'
        `);
        resObj.rows.forEach(r => console.log(`- ${r.table_name}`));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit();
    }
}

listMetricTables();
