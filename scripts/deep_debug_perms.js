const { pool } = require('../src/utils/database');

async function deepDebug() {
    try {
        console.log('--- TOUS LES RÔLES ---');
        const roles = await pool.query("SELECT id, name FROM roles");
        const roleMap = {};
        roles.rows.forEach(r => {
            console.log(`[${r.id}] -> "${r.name}"`);
            roleMap[r.id] = r.name;
        });

        console.log('\n--- TOUTES LES PERMISSIONS OBJECTIFS ---');
        const perms = await pool.query("SELECT id, code FROM permissions WHERE category = 'objectives'");
        const permIds = perms.rows.map(p => p.id);
        perms.rows.forEach(p => console.log(`[${p.id}] -> ${p.code}`));

        console.log('\n--- TOUTES LES ENTRÉES DANS role_permissions POUR CES PERMISSIONS ---');
        const rp = await pool.query("SELECT * FROM role_permissions WHERE permission_id = ANY($1)", [permIds]);
        console.log(`Nombre d'entrées trouvées: ${rp.rows.length}`);
        rp.rows.forEach(row => {
            const roleName = roleMap[row.role_id] || 'INCONNU';
            console.log(`Role ID: [${row.role_id}] (${roleName}) | Perm ID: [${row.permission_id}]`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit();
    }
}

deepDebug();
