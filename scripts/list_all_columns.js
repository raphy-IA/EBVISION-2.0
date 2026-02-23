const { pool } = require('../src/utils/database');

async function listAllColumns() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'opportunities'
            ORDER BY ordinal_position;
        `);
        console.log('--- Colonnes de la table opportunities ---');
        res.rows.forEach(row => {
            console.log(`${row.column_name} (${row.data_type})`);
        });

        const fyRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'fiscal_years'
            ORDER BY ordinal_position;
        `);
        console.log('\n--- Colonnes de la table fiscal_years ---');
        fyRes.rows.forEach(row => {
            console.log(`${row.column_name} (${row.data_type})`);
        });
    } catch (error) {
        console.error('Erreur :', error);
    } finally {
        client.release();
        pool.end();
    }
}

listAllColumns();
