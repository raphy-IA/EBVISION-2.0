const Objective = require('../src/models/Objective');
const { pool } = require('../src/utils/database');

async function testRoute() {
    try {
        const fyId = '9bb09c52-a16c-4c1a-ab68-0573a4bc9bf2'; // FY26
        const userId = '99112327-4439-4e1f-a47a-ff16ff0423ac';

        const buAccessResult = await pool.query(`
            SELECT DISTINCT bu_ids.business_unit_id FROM (
                SELECT business_unit_id FROM user_business_unit_access WHERE user_id = $1 AND granted = true
                UNION
                SELECT business_unit_id FROM collaborateurs WHERE user_id = $1 AND business_unit_id IS NOT NULL
            ) bu_ids
        `, [userId]);
        const authorizedBuIds = buAccessResult.rows.map(r => r.business_unit_id);

        console.log('authorizedBuIds:', authorizedBuIds);

        // Manually run a similar query to see if ANY() works as expected
        const testSql = "SELECT id FROM business_unit_objectives WHERE business_unit_id = ANY($1)";
        const testRes = await pool.query(testSql, [authorizedBuIds]);
        console.log('Test query for business_unit_id = ANY($1) returned:', testRes.rows.length, 'rows');

        const objectives = await Objective.getAllObjectives(fyId, authorizedBuIds);
        console.log('Objective.getAllObjectives returned:', objectives.length);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

testRoute();
