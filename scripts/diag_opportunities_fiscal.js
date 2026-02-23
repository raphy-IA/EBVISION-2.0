const { pool } = require('../src/utils/database');

async function checkOpportunities() {
    const client = await pool.connect();
    try {
        console.log('--- Diagnostic des Opportunités & Années Fiscales ---');

        // 1. Nombre d'opportunités par fiscal_year_id
        const countByFY = await client.query(`
            SELECT 
                fiscal_year_id, 
                COUNT(*) as count 
            FROM opportunities 
            GROUP BY fiscal_year_id 
            ORDER BY fiscal_year_id NULLS FIRST
        `);
        console.log('\nRépartition par année fiscale (ID) :');
        console.table(countByFY.rows);

        // 2. Liste des années fiscales avec dates
        const fiscalYears = await client.query(`
            SELECT id, label, start_date, end_date 
            FROM fiscal_years 
            ORDER BY start_date
        `);
        console.log('\nAnnées fiscales disponibles :');
        console.table(fiscalYears.rows);

        // 3. Exemple d'opportunités orphelines (sans fiscal_year_id)
        const orphans = await client.query(`
            SELECT id, nom, created_at, date_fermeture_prevue, fiscal_year_id
            FROM opportunities 
            WHERE fiscal_year_id IS NULL OR fiscal_year_id = 0
            LIMIT 10
        `);
        if (orphans.rows.length > 0) {
            console.log('\nÉchantillon d\'opportunités orphelines :');
            console.table(orphans.rows);
        } else {
            console.log('\nAucune opportunité orpheline trouvée.');
        }

    } catch (error) {
        console.error('Erreur :', error);
    } finally {
        client.release();
        pool.end();
    }
}

checkOpportunities();
