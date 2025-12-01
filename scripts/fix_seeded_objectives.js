const { pool } = require('../src/utils/database');

async function fixSeededObjectives() {
    try {
        console.log('🔧 Fixing seeded objective types...');

        // 1. Fix Mission Revenue (montant_total -> montant_honoraires)
        await pool.query(`
            UPDATE objective_types 
            SET value_field = 'montant_honoraires' 
            WHERE entity_type = 'MISSION' AND value_field = 'montant_total'
        `);
        console.log('✓ Fixed Mission Revenue');

        // 2. Fix Invoice Paid Amount (montant_total -> montant_ttc)
        await pool.query(`
            UPDATE objective_types 
            SET value_field = 'montant_ttc' 
            WHERE entity_type = 'INVOICE' AND value_field = 'montant_total'
        `);
        console.log('✓ Fixed Invoice Paid Amount');

        // 3. Fix any CUSTOMER entity type to CLIENT (if any)
        await pool.query(`
            UPDATE objective_types 
            SET entity_type = 'CLIENT' 
            WHERE entity_type = 'CUSTOMER'
        `);
        console.log('✓ Fixed CUSTOMER -> CLIENT');

        // 4. Fix old data with null entity_type (set to inactive or delete)
        // For now, let's just log them
        const res = await pool.query(`SELECT id, code FROM objective_types WHERE entity_type IS NULL`);
        if (res.rowCount > 0) {
            console.log(`⚠️ Found ${res.rowCount} objectives with NULL entity_type. Setting them to inactive.`);
            await pool.query(`UPDATE objective_types SET is_active = FALSE WHERE entity_type IS NULL`);
        }

        console.log('✅ Fixes applied.');

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
}

fixSeededObjectives();
