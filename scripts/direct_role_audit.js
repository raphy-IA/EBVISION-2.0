const { pool } = require('../src/utils/database');

async function directAudit() {
    try {
        const roleId = '78b98c58-c282-489b-9d36-7584f990821e'; // SENIOR_PARTNER
        console.log(`--- AUDIT DIRECT ROLE_PERMISSIONS POUR ${roleId} ---`);

        const res = await pool.query("SELECT * FROM role_permissions WHERE role_id = $1", [roleId]);
        console.log(`Nombre d'entrées dans role_permissions pour ce rôle: ${res.rows.length}`);

        if (res.rows.length > 0) {
            const permIds = res.rows.map(r => r.permission_id);
            const perms = await pool.query("SELECT id, code, category FROM permissions WHERE id = ANY($1)", [permIds]);
            perms.rows.forEach(p => {
                console.log(`- ID: ${p.id} | Code: ${p.code} | Category: ${p.category}`);
            });
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit();
    }
}

directAudit();
