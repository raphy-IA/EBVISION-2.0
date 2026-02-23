const { pool } = require('../src/utils/database');

async function check() {
    try {
        // find user Emile Bitoungui
        const userRes = await pool.query("SELECT id, nom, prenom FROM users WHERE nom ILIKE '%Bitoungui%' OR prenom ILIKE '%Emile%'");
        if (userRes.rows.length === 0) {
            console.log('USER NOT FOUND');
            return;
        }
        const user = userRes.rows[0];
        console.log(`USER: ${user.nom} ${user.prenom} (${user.id})`);

        // Get effective permissions
        const permRes = await pool.query(`
            SELECT DISTINCT p.code 
            FROM permissions p
            WHERE (
                EXISTS (
                    SELECT 1 FROM role_permissions rp
                    JOIN user_roles ur ON rp.role_id = ur.role_id
                    WHERE ur.user_id = $1 AND rp.permission_id = p.id
                )
                OR
                EXISTS (
                    SELECT 1 FROM user_permissions up
                    WHERE up.user_id = $1 AND up.permission_id = p.id
                )
            )
            AND (p.code LIKE 'objectives%' OR p.code LIKE 'OBJECTIVES%')
            ORDER BY p.code
        `, [user.id]);

        console.log('EFFECTIVE OBJECTIVE PERMISSIONS:');
        permRes.rows.forEach(r => console.log(`- ${r.code}`));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit();
    }
}

check();
