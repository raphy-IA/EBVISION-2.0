const { query } = require('./src/utils/database');

async function testGlobalSql() {
    try {
        const fiscalYearId = 'aa312d1a-92b6-4462-96e8-8483c9460cb8';
        const globalSql = `
            SELECT 
                go.*, 
                'GLOBAL' as scope,
                COALESCE(ot.code, om.code) as type_code,
                COALESCE(ot.label, om.label) as type_label
            FROM global_objectives go
            LEFT JOIN objective_types ot ON go.objective_type_id = ot.id
            LEFT JOIN objective_metrics om ON go.metric_id = om.id
            WHERE go.fiscal_year_id = $1
        `;
        console.log('Testing globalSql...');
        const res = await query(globalSql, [fiscalYearId]);
        console.log('Success!', res.rows.length);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testGlobalSql();
