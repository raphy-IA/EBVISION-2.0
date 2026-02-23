const { pool } = require('../src/utils/database');

async function check() {
    const tables = [
        'global_objectives', 'business_unit_objectives', 'division_objectives', 'individual_objectives',
        'business_units', 'divisions', 'collaborateurs'
    ];
    for (const table of tables) {
        try {
            const res = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1 
                ORDER BY ordinal_position`, [table]);

            console.log(`\nTABLE: ${table}`);
            if (res.rows.length === 0) {
                console.log('  (Table not found or no columns)');
            } else {
                res.rows.forEach(r => console.log(`  ${r.column_name.padEnd(25)} (${r.data_type})`));
            }
        } catch (e) {
            console.log(`ERROR for ${table}:`, e.message);
        }
    }
    process.exit();
}

check();
