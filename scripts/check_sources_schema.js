const { query } = require('../src/utils/database');

async function checkSchema() {
    const result = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'objective_metric_sources' 
        AND column_name IN ('objective_type_id', 'unit_id')
        ORDER BY column_name
    `);

    console.log('Schema objective_metric_sources:');
    result.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    process.exit(0);
}

checkSchema().catch(e => { console.error(e); process.exit(1); });
