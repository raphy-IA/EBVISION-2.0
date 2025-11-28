const { pool } = require('../src/utils/database');

async function checkDuplicates() {
    try {
        console.log('Checking for duplicate permissions...');

        const result = await pool.query(`
            SELECT code, count(*) 
            FROM permissions 
            WHERE code LIKE 'menu.%'
            GROUP BY code 
            HAVING count(*) > 1
        `);

        if (result.rows.length === 0) {
            console.log('✅ No exact code duplicates found.');
        } else {
            console.log(`❌ Found ${result.rows.length} duplicates by code:`);
            result.rows.forEach(row => {
                console.log(`- ${row.code}: ${row.count} times`);
            });
        }

        console.log('\nChecking for similar permissions (potential duplicates with different codes)...');
        const allPerms = await pool.query(`
            SELECT id, code, name, description 
            FROM permissions 
            WHERE code LIKE 'menu.%'
            ORDER BY code
        `);

        allPerms.rows.forEach(p => {
            console.log(`[${p.id}] ${p.code} | ${p.name}`);
        });

    } catch (error) {
        console.error('Error checking database:', error);
    } finally {
        await pool.end();
    }
}

checkDuplicates();
