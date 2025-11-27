const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function debugRoute() {
    try {
        console.log('🐞 Debugging Strategic Objectives Route (Minimal Logs)...');

        const query = {
            period: '90',
            business_unit: '',
            year: '2024'
        };

        const { period = 90, business_unit = '', year = 2024 } = query;
        console.log('Params:', { period, business_unit, year });

        // 1. Fetch Targets
        console.log('1. Fetching Targets...');
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

        await pool.query(targetsQuery, targetsParams);
        console.log('   ✅ Targets fetched');

        // 2. Calculate Actuals
        console.log('2. Calculating Actuals...');
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);

        let whereConditions = ['m.created_at >= $1 AND m.created_at <= $2'];
        let params = [startDate.toISOString(), endDate.toISOString()];
        let paramIndex = 3;

        if (business_unit) {
            whereConditions.push(`bu.id = $${paramIndex++}`);
            params.push(business_unit);
        }

        const whereClause = whereConditions.join(' AND ');

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
            WHERE ${whereClause}
        `;

        await pool.query(financialQuery, params);
        console.log('   ✅ Financials calculated');

        // 3. Conversion
        console.log('3. Calculating Conversion...');
        let oppWhereConditions = ['o.date_cloture >= $1 AND o.date_cloture <= $2'];
        let oppParams = [startDate.toISOString(), endDate.toISOString()];
        let oppParamIndex = 3;

        if (business_unit) {
            oppWhereConditions.push(`o.business_unit_id = $${oppParamIndex++}`);
            oppParams.push(business_unit);
        }

        const conversionQuery = `
            SELECT 
                COUNT(CASE WHEN o.statut = 'GAGNEE' THEN 1 END) as gagnees,
                COUNT(CASE WHEN o.statut IN ('GAGNEE', 'PERDUE') THEN 1 END) as total_closes
            FROM opportunities o
            WHERE ${oppWhereConditions.join(' AND ')}
        `;

        await pool.query(conversionQuery, oppParams);
        console.log('   ✅ Conversion calculated');

        console.log('✅ Success! No error thrown.');

    } catch (error) {
        console.error('❌ ERROR CAUGHT:');
        console.error(error.message);
        if (error.code) console.error('Code:', error.code);
        if (error.detail) console.error('Detail:', error.detail);
    } finally {
        await pool.end();
    }
}

debugRoute();
