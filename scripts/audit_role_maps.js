const { pool } = require('../src/utils/database');

async function audit() {
    try {
        console.log('--- AUDIT DES ASSIGNATIONS PAR RÔLE ---');
        const res = await pool.query(`
            SELECT r.name as role_name, p.code as perm_code, p.id as perm_id
            FROM role_permissions rp 
            JOIN roles r ON rp.role_id = r.id 
            JOIN permissions p ON rp.permission_id = p.id 
            WHERE p.category = 'objectives'
            ORDER BY r.name, p.code
        `);

        if (res.rows.length === 0) {
            console.log('Aucune assignation trouvée pour la catégorie "objectives".');
            return;
        }

        let currentRole = '';
        res.rows.forEach(r => {
            if (r.role_name !== currentRole) {
                currentRole = r.role_name;
                console.log(`\nRôle: ${currentRole}`);
            }
            console.log(`  - ${r.perm_code} (${r.perm_id})`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit();
    }
}

audit();
