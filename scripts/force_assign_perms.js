const { pool } = require('../src/utils/database');

async function forceAssign() {
    try {
        console.log('--- FORCE ASSIGN PERMISSIONS TO SENIOR_PARTNER ---');

        const roleRes = await pool.query("SELECT id FROM roles WHERE name = 'SENIOR_PARTNER'");
        if (roleRes.rows.length === 0) {
            console.error('Role SENIOR_PARTNER non trouvé');
            return;
        }
        const roleId = roleRes.rows[0].id;
        console.log(`Role ID: ${roleId}`);

        const perms = await pool.query("SELECT id, code FROM permissions WHERE category = 'objectives'");
        console.log(`Nombre de permissions d'objectifs trouvées: ${perms.rows.length}`);

        for (const p of perms.rows) {
            console.log(`Traitement de ${p.code} (ID: ${p.id})...`);
            // Check if exists
            const check = await pool.query("SELECT 1 FROM role_permissions WHERE role_id = $1 AND permission_id = $2", [roleId, p.id]);
            if (check.rows.length > 0) {
                console.log(`  - Déjà assignée.`);
            } else {
                await pool.query("INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)", [roleId, p.id]);
                console.log(`  - ASSIGNÉE AVEC SUCCÈS.`);
            }
        }

        console.log('--- VERIFICATION FINALE ---');
        const finalCheck = await pool.query(`
            SELECT p.code 
            FROM role_permissions rp 
            JOIN permissions p ON rp.permission_id = p.id 
            WHERE rp.role_id = $1 AND p.category = 'objectives'
        `, [roleId]);
        console.log(`Nombre total assigné maintenant: ${finalCheck.rows.length}`);

    } catch (e) {
        console.error('❌ Erreur:', e);
    } finally {
        await pool.end();
        process.exit();
    }
}

forceAssign();
