const { query } = require('./src/utils/database');

async function testBuSql() {
    try {
        const fiscalYearId = 'aa312d1a-92b6-4462-96e8-8483c9460cb8';
        const buSql = `
            SELECT 
                buo.*, 
                'BU' as scope,
                COALESCE(ot.code, om.code) as type_code,
                COALESCE(ot.label, om.label) as type_label,
                bu.nom as business_unit_name
            FROM business_unit_objectives buo
            JOIN global_objectives go ON buo.global_objective_id = go.id
            LEFT JOIN business_units bu ON buo.business_unit_id = bu.id
            LEFT JOIN objective_types ot ON buo.objective_type_id = ot.id
            LEFT JOIN objective_metrics om ON buo.metric_id = om.id
            WHERE go.fiscal_year_id = $1
        `;
        console.log('Testing buSql...');
        const res = await query(buSql, [fiscalYearId]);
        console.log('Success!', res.rows.length);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testBuSql();
