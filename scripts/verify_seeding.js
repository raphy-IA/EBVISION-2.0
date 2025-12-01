const { pool } = require('../src/utils/database');

async function verifySeeding() {
    try {
        const res = await pool.query(`
            SELECT id, code, label, entity_type, operation, value_field 
            FROM objective_types 
            WHERE id BETWEEN 19 AND 28 
            ORDER BY id
        `);

        console.log('=== SEEDED OBJECTIVE TYPES ===');
        console.log(`Found ${res.rowCount} types:\n`);

        res.rows.forEach(r => {
            console.log(`[${r.id}] ${r.code}`);
            console.log(`  Label: ${r.label}`);
            console.log(`  Tracking: ${r.entity_type} → ${r.operation} → ${r.value_field}`);
            console.log('');
        });

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}

verifySeeding();
