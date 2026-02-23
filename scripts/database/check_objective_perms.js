const { pool } = require('../../src/utils/database');

async function checkObjectivePermissions() {
    const client = await pool.connect();

    try {
        const result = await pool.query(`
            SELECT code, name 
            FROM permissions 
            WHERE code LIKE 'objectives%'
            ORDER BY code
        `);

        console.log('\n🔍 Permissions liées aux objectifs:');
        console.log('='.repeat(60));
        result.rows.forEach(p => {
            console.log(`  ${p.code.padEnd(40)} - ${p.name}`);
        });

        console.log(`\n📊 Total: ${result.rows.length} permissions trouvées\n`);

    } catch (e) {
        console.error('Erreur:', e.message);
    } finally {
        client.release();
        pool.end();
    }
}

checkObjectivePermissions();
