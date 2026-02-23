const { pool } = require('../src/utils/database');

async function countAll() {
    try {
        const fyRes = await pool.query("SELECT id, libelle, statut FROM fiscal_years");
        for (const fy of fyRes.rows) {
            const goCount = await pool.query("SELECT COUNT(*) FROM global_objectives WHERE fiscal_year_id = $1", [fy.id]);
            const buObjCount = await pool.query(`
                SELECT COUNT(*) 
                FROM business_unit_objectives buo
                JOIN global_objectives go ON buo.global_objective_id = go.id
                WHERE go.fiscal_year_id = $1
            `, [fy.id]);
            const divObjCount = await pool.query(`
                SELECT COUNT(*) 
                FROM division_objectives dio
                JOIN business_unit_objectives buo ON dio.parent_bu_objective_id = buo.id
                JOIN global_objectives go ON buo.global_objective_id = go.id
                WHERE go.fiscal_year_id = $1
            `, [fy.id]);

            console.log(`FY: ${fy.libelle} (${fy.statut})`);
            console.log(`- Global: ${goCount.rows[0].count}`);
            console.log(`- BU: ${buObjCount.rows[0].count}`);
            console.log(`- Div: ${divObjCount.rows[0].count}`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

countAll();
