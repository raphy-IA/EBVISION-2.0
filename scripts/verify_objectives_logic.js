const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function verifyLogic() {
    try {
        console.log('🔍 Vérification de la logique des objectifs stratégiques...');

        const year = 2024;
        const business_unit = null; // Test global

        // 1. Test Targets Query
        console.log('1. Test Récupération Objectifs...');
        let targetsQuery = `
            SELECT type, target_value, unit
            FROM strategic_objectives
            WHERE year = $1
        `;
        const targetsParams = [year];
        if (business_unit) {
            targetsQuery += ` AND business_unit_id = $2`;
            targetsParams.push(business_unit);
        } else {
            targetsQuery += ` AND business_unit_id IS NULL`;
        }
        const targetsResult = await pool.query(targetsQuery, targetsParams);
        console.log('   ✅ Objectifs trouvés:', targetsResult.rows.length);
        console.log('   Exemple:', targetsResult.rows[0]);

        // 2. Test Financial Query
        console.log('2. Test Calculs Financiers...');
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);

        let whereConditions = ['m.created_at >= $1 AND m.created_at <= $2'];
        let params = [startDate.toISOString(), endDate.toISOString()];

        const financialQuery = `
            SELECT 
                COALESCE(SUM(m.montant_honoraires), 0) as ca,
                COALESCE(SUM(te.heures * COALESCE(g.taux_horaire_default, 0)), 0) as cout
            FROM missions m
            LEFT JOIN time_entries te ON te.mission_id = m.id
            LEFT JOIN users u ON te.user_id = u.id
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            WHERE ${whereConditions.join(' AND ')}
        `;

        const financialResult = await pool.query(financialQuery, params);
        console.log('   ✅ Données financières:', financialResult.rows[0]);

        // 3. Test Conversion Query
        console.log('3. Test Conversion...');
        let oppWhereConditions = ['o.date_fermeture_reelle >= $1 AND o.date_fermeture_reelle <= $2'];
        const conversionQuery = `
            SELECT 
                COUNT(CASE WHEN o.statut = 'GAGNEE' THEN 1 END) as gagnees,
                COUNT(CASE WHEN o.statut IN ('GAGNEE', 'PERDUE') THEN 1 END) as total_closes
            FROM opportunities o
            WHERE ${oppWhereConditions.join(' AND ')}
        `;
        const conversionResult = await pool.query(conversionQuery, params);
        console.log('   ✅ Données conversion:', conversionResult.rows[0]);

        console.log('🎉 Vérification terminée avec succès !');

    } catch (error) {
        console.error('❌ Erreur de vérification:', error);
    } finally {
        await pool.end();
    }
}

verifyLogic();
