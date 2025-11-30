const { query } = require('./src/utils/database');

async function testDivSql() {
    try {
        const fiscalYearId = 'aa312d1a-92b6-4462-96e8-8483c9460cb8';
        const divSql = `
            SELECT 
                do.*, 
                'DIVISION' as scope,
                COALESCE(ot.code, om.code) as type_code,
                COALESCE(ot.label, om.label) as type_label,
                d.nom as division_name
            FROM division_objectives do
            JOIN business_unit_objectives buo ON do.parent_bu_objective_id = buo.id
            JOIN global_objectives go ON buo.global_objective_id = go.id
            LEFT JOIN divisions d ON do.division_id = d.id
            LEFT JOIN objective_types ot ON do.objective_type_id = ot.id
            LEFT JOIN objective_metrics om ON do.metric_id = om.id
            WHERE go.fiscal_year_id = $1
        `;
        console.log('Testing divSql...');
        const res = await query(divSql, [fiscalYearId]);
        console.log('Success!', res.rows.length);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testDivSql();
