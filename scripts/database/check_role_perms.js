const { pool } = require('../../src/utils/database');

async function checkRolePermissions() {
    const client = await pool.connect();

    try {
        const result = await pool.query(`
            SELECT r.name as role_name, p.code as permission_code
            FROM roles r
            JOIN role_permissions rp ON r.id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE p.code LIKE 'objectives.individual%' OR p.code LIKE 'objectives:%'
            ORDER BY r.name, p.code
        `);

        console.log('\n🔍 Rôles ayant des permissions d\'objectifs individuels:');
        console.log('='.repeat(60));
        result.rows.forEach(row => {
            console.log(`  ${row.role_name.padEnd(20)} -> ${row.permission_code}`);
        });

        console.log(`\n📊 Total: ${result.rows.length} attributions trouvées\n`);

    } catch (e) {
        console.error('Erreur:', e.message);
    } finally {
        client.release();
        pool.end();
    }
}

checkRolePermissions();
