const { pool } = require('../src/utils/database');

async function auditSchemas() {
    try {
        const tables = ['global_objectives', 'business_unit_objectives', 'division_objectives', 'individual_objectives'];
        console.log('--- OBJECTIVES SCHEMA AUDIT ---');

        for (const table of tables) {
            const res = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [table]);

            console.log(`\nTable: ${table}`);
            console.table(res.rows);
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

auditSchemas();
