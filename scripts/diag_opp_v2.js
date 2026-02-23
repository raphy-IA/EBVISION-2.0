const { pool } = require('../src/utils/database');

async function checkOpportunities() {
    const client = await pool.connect();
    try {
        console.log('--- Diagnostic des Opportunités & Années Fiscales v2 ---');

        // 1. Nombre d'opportunités sans année fiscale
        const orphansRes = await client.query(`
            SELECT COUNT(*) as orphan_count 
            FROM opportunities 
            WHERE fiscal_year_id IS NULL
        `);
        console.log(`Opportunités sans fiscal_year_id : ${orphansRes.rows[0].orphan_count}`);

        // 2. Nombre d'opportunités par année fiscale
        const fyCountsRes = await client.query(`
            SELECT fy.libelle, fy.annee, COUNT(o.id) as count
            FROM opportunities o
            LEFT JOIN fiscal_years fy ON o.fiscal_year_id = fy.id
            GROUP BY fy.libelle, fy.annee
            ORDER BY fy.annee NULLS FIRST
        `);
        console.log('\nRépartition par année fiscale :');
        console.table(fyCountsRes.rows);

        // 3. Récupérer les dates des années fiscales
        const fyDatesRes = await client.query(`
            SELECT id, libelle, annee, date_debut, date_fin 
            FROM fiscal_years 
            ORDER BY date_debut
        `);
        console.log('\nDates des années fiscales :');
        console.table(fyDatesRes.rows);

    } catch (error) {
        console.error('Erreur SQL détaillé :', error);
    } finally {
        client.release();
        pool.end();
    }
}

checkOpportunities();
