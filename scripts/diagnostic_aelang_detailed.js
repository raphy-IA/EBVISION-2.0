const pool = require('../src/utils/database');

async function diagnostic() {
    try {
        const fyId = '9bb09c52-a16c-4c1a-ab68-0573a4bc9bf2'; // FY26
        const userId = '99112327-4439-4e1f-a47a-ff16ff0423ac'; // aelang

        console.log('--- DIAGNOSTIC DATA DUMP ---');

        // 1. Authorized BUs
        const buRes = await pool.query(`
            SELECT DISTINCT bu.id, bu.nom
            FROM (
                SELECT business_unit_id FROM user_business_unit_access WHERE user_id = $1 AND granted = true
                UNION
                SELECT business_unit_id FROM collaborateurs WHERE user_id = $1 AND business_unit_id IS NOT NULL
            ) bu_ids
            JOIN business_units bu ON bu_ids.business_unit_id = bu.id
        `, [userId]);
        const buIds = buRes.rows.map(r => r.id);
        console.log('Authorized BUs for aelang:', buRes.rows.map(r => `${r.nom} (${r.id})`));

        // 2. Global Objectives
        const goRes = await pool.query("SELECT id, title FROM global_objectives WHERE fiscal_year_id = $1", [fyId]);
        console.log('\nFound Global Objectives in FY26:', goRes.rows.length);

        // 3. BU Objectives
        const buoRes = await pool.query(`
            SELECT buo.id, buo.business_unit_id, bu.nom as bu_name, buo.global_objective_id
            FROM business_unit_objectives buo
            JOIN business_units bu ON buo.business_unit_id = bu.id
            JOIN global_objectives go ON buo.global_objective_id = go.id
            WHERE go.fiscal_year_id = $1
        `, [fyId]);
        console.log(`\nFound ${buoRes.rows.length} BU Objectives in FY26`);

        // 4. Matches
        const matches = buoRes.rows.filter(r => buIds.includes(r.business_unit_id));
        console.log(`\nMatches for aelang's BUs: ${matches.length}`);
        matches.forEach(m => {
            console.log(`- BU: ${m.bu_name}, GoalID: ${m.global_objective_id}, BUO_ID: ${m.id}`);
        });

        // 5. Query check
        const sql = `
            SELECT buo.id
            FROM business_unit_objectives buo
            JOIN global_objectives go ON buo.global_objective_id = go.id
            WHERE go.fiscal_year_id = $1 AND buo.business_unit_id = ANY($2)
        `;
        const res = await pool.query(sql, [fyId, buIds]);
        console.log('\nResult of direct SQL query:', res.rows.length, 'rows');

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

diagnostic();
