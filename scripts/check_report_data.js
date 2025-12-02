const { pool } = require('../src/utils/database');

async function checkData() {
    try {
        console.log('--- Checking type_heures values ---');
        const typeResult = await pool.query(`
            SELECT DISTINCT type_heures, COUNT(*) as count 
            FROM time_entries 
            GROUP BY type_heures
        `);
        console.table(typeResult.rows);

        console.log('\n--- Checking Client Data ---');
        const clientResult = await pool.query(`
            SELECT 
                m.id as mission_id, 
                m.nom as mission_nom, 
                m.client_id, 
                c.raison_sociale as client_nom,
                COUNT(te.id) as time_entries_count
            FROM missions m
            LEFT JOIN clients c ON m.client_id = c.id
            LEFT JOIN time_entries te ON m.id = te.mission_id
            GROUP BY m.id, m.nom, m.client_id, c.raison_sociale
            HAVING COUNT(te.id) > 0
            LIMIT 10
        `);
        console.table(clientResult.rows);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        pool.end();
    }
}

checkData();
