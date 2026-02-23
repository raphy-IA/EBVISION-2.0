const { query } = require('../src/utils/database');

async function listTriggers() {
    const sql = `
        SELECT 
            event_object_table as table_name,
            trigger_name
        FROM information_schema.triggers
        WHERE event_object_table IN ('global_objectives', 'business_unit_objectives', 'division_objectives', 'individual_objectives')
        ORDER BY event_object_table, trigger_name;
    `;

    try {
        const result = await query(sql);
        console.log('Triggers on objective tables:');
        console.table(result.rows);
    } catch (error) {
        console.error('Error fetching triggers:', error);
    } finally {
        process.exit();
    }
}

listTriggers();
