const { pool } = require('../src/utils/database');

async function hardReset() {
    try {
        console.log('--- HARD RESET PERMISSIONS POUR SENIOR_PARTNER ---');

        const roleRes = await pool.query("SELECT id FROM roles WHERE name = 'SENIOR_PARTNER'");
        if (roleRes.rows.length === 0) {
            console.error('Role SENIOR_PARTNER non trouvé');
            return;
        }
        const roleId = roleRes.rows[0].id;
        console.log(`Role ID: ${roleId}`);

        const perms = await pool.query("SELECT id, code FROM permissions WHERE category = 'objectives'");
        const permIds = perms.rows.map(p => p.id);
        console.log(`Nombre de permissions d'objectifs: ${perms.rows.length}`);

        // 1. Supprimer les assignations existantes pour la catégorie objectives
        const delRes = await pool.query(`
            DELETE FROM role_permissions 
            WHERE role_id = $1 AND permission_id = ANY($2)
        `, [roleId, permIds]);
        console.log(`${delRes.rowCount} entrées supprimées.`);

        // 2. Ré-insérer proprement
        for (const pId of permIds) {
            await pool.query("INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)", [roleId, pId]);
        }
        console.log(`${permIds.length} entrées ré-insérées.`);

        // 3. Vérification finale
        const final = await pool.query(`
            SELECT COUNT(*) 
            FROM role_permissions rp 
            JOIN permissions p ON rp.permission_id = p.id 
            WHERE rp.role_id = $1 AND p.category = 'objectives'
        `, [roleId]);
        console.log(`Vérification finale: ${final.rows[0].count} permissions assignées.`);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit();
    }
}

hardReset();
