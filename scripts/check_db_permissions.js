const { pool } = require('../src/utils/database');

async function checkPermissions() {
    try {
        console.log('Checking permissions for "menu.objectifs" and "menu.evaluations"...');

        const result = await pool.query(`
            SELECT code, name, category 
            FROM permissions 
            WHERE code LIKE 'menu.objectifs%' OR code LIKE 'menu.evaluations%'
            ORDER BY code
        `);

        if (result.rows.length === 0) {
            console.log('❌ No permissions found for Objectifs or Evaluations.');
        } else {
            console.log(`✅ Found ${result.rows.length} permissions:`);
            result.rows.forEach(row => {
                console.log(`- ${row.code} (${row.name})`);
            });
        }

        // Also check if menu items exist
        console.log('\nChecking menu items...');
        const menuResult = await pool.query(`
            SELECT mi.label, mi.code, ms.name as section
            FROM menu_items mi
            JOIN menu_sections ms ON mi.section_id = ms.id
            WHERE ms.name IN ('OBJECTIFS', 'ÉVALUATIONS')
            ORDER BY ms.name, mi.display_order
        `);

        if (menuResult.rows.length === 0) {
            console.log('❌ No menu items found for Objectifs or Evaluations sections.');
        } else {
            console.log(`✅ Found ${menuResult.rows.length} menu items:`);
            menuResult.rows.forEach(row => {
                console.log(`- [${row.section}] ${row.label} (${row.code})`);
            });
        }

    } catch (error) {
        console.error('Error checking database:', error);
    } finally {
        await pool.end();
    }
}

checkPermissions();
