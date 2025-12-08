const { pool } = require('../src/utils/database');

async function checkPermissions() {
    const client = await pool.connect();

    try {
        // Chercher les permissions liées aux users
        const result = await pool.query(`
            SELECT code, name 
            FROM permissions 
            WHERE code LIKE '%user%' OR code LIKE '%User%'
            ORDER BY code
        `);

        console.log('\n🔍 Permissions contenant "user":');
        console.log('='.repeat(60));
        result.rows.forEach(p => {
            console.log(`  ${p.code.padEnd(40)} - ${p.name}`);
        });

        console.log(`\n📊 Total: ${result.rows.length} permissions trouvées\n`);

        // Chercher toutes les permissions de type "action"
        const actionPerms = await pool.query(`
            SELECT code, name 
            FROM permissions 
            WHERE code LIKE '%:%'
            ORDER BY code
            LIMIT 20
        `);

        console.log('🔍 Permissions avec le format "category:action":');
        console.log('='.repeat(60));
        actionPerms.rows.forEach(p => {
            console.log(`  ${p.code.padEnd(40)} - ${p.name}`);
        });

        console.log(`\n📊 Total: ${actionPerms.rows.length} permissions avec ":"\n`);

    } catch (e) {
        console.error('Erreur:', e.message);
    } finally {
        client.release();
        pool.end();
    }
}

checkPermissions();
