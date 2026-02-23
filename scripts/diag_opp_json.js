const { pool } = require('../src/utils/database');
const fs = require('fs');

async function checkOpportunities() {
    const client = await pool.connect();
    try {
        const results = {
            orphans: 0,
            distribution: [],
            calendar: []
        };

        // 1. Orphans
        const orphansRes = await client.query(`SELECT COUNT(*) as orphan_count FROM opportunities WHERE fiscal_year_id IS NULL`);
        results.orphans = parseInt(orphansRes.rows[0].orphan_count);

        // 2. Distribution
        const fyCountsRes = await client.query(`
            SELECT fy.libelle, fy.annee, COUNT(o.id) as count
            FROM opportunities o
            LEFT JOIN fiscal_years fy ON o.fiscal_year_id = fy.id
            GROUP BY fy.libelle, fy.annee
            ORDER BY fy.annee NULLS FIRST
        `);
        results.distribution = fyCountsRes.rows;

        // 3. Calendar
        const fyDatesRes = await client.query(`SELECT id, libelle, annee, date_debut, date_fin FROM fiscal_years ORDER BY date_debut`);
        results.calendar = fyDatesRes.rows;

        fs.writeFileSync('diag_opp_results.json', JSON.stringify(results, null, 2));
        console.log('Résultats sauvegardés dans diag_opp_results.json');

    } catch (error) {
        console.error('Erreur :', error);
    } finally {
        client.release();
        pool.end();
    }
}

checkOpportunities();
