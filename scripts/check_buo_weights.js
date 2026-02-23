const { pool } = require('../src/utils/database');

async function checkWeights() {
    try {
        const fyId = '9bb09c52-a16c-4c1a-ab68-0573a4bc9bf2'; // FY26
        const res = await pool.query(`
            SELECT 
                buo.id, 
                buo.weight, 
                bu.nom as bu_name, 
                go.title as global_title,
                buo.global_objective_id,
                buo.parent_global_objective_id
            FROM business_unit_objectives buo 
            LEFT JOIN business_units bu ON buo.business_unit_id = bu.id 
            LEFT JOIN global_objectives go ON buo.global_objective_id = go.id 
            WHERE go.fiscal_year_id = $1 OR buo.global_objective_id IN (SELECT id FROM global_objectives WHERE fiscal_year_id = $1)
        `, [fyId]);

        console.log('--- WEIGHTS CHECK FY26 ---');
        if (res.rows.length === 0) {
            console.log('No BU objectives found for this FY.');
        } else {
            console.table(res.rows.map(r => ({
                BU: r.bu_name,
                Goal: (r.global_title || 'N/A').substring(0, 40),
                Weight: r.weight,
                ID: r.id
            })));
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

checkWeights();
