const { pool } = require('../src/utils/database');

async function auditObjectives() {
    try {
        console.log('=== AUDIT OBJECTIVE TYPES ===\n');

        const res = await pool.query(`
            SELECT id, code, label, unit, entity_type, operation, value_field 
            FROM objective_types 
            ORDER BY id
        `);

        console.table(res.rows.map(r => ({
            ID: r.id,
            Code: r.code,
            Unit: r.unit || 'NULL',
            Entity: r.entity_type || 'NULL',
            Op: r.operation || 'NULL',
            Field: r.value_field || 'NULL'
        })));

        const missing = res.rows.filter(r => !r.entity_type || !r.operation || !r.value_field);

        if (missing.length > 0) {
            console.log('\n⚠️  TYPES AVEC CONFIGURATION MANQUANTE :');
            missing.forEach(r => {
                console.log(`- [${r.id}] ${r.code}: Entity=${r.entity_type}, Op=${r.operation}, Field=${r.value_field}`);
            });
        } else {
            console.log('\n✅ Tous les types ont une configuration de tracking complète.');
        }

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}

auditObjectives();
