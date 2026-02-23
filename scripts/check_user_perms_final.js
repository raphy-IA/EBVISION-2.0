const { pool } = require('../src/utils/database');

async function checkUserPerms() {
    try {
        console.log('--- RECHERCHE DES PERMISSIONS D\'EMILE BITOUNGUI ---');
        // Fetch by email or name
        const userRes = await pool.query("SELECT id, nom, email FROM users WHERE nom = 'Bitoungui' OR email LIKE 'ebitoungui%'");
        if (userRes.rows.length === 0) {
            console.error('Utilisateur non trouvé');
            return;
        }
        const userId = userRes.rows[0].id;
        console.log(`Utilisateur ID: ${userId} (${userRes.rows[0].nom}, ${userRes.rows[0].email})`);

        const res = await pool.query(`
            SELECT DISTINCT p.code, p.category
            FROM permissions p 
            JOIN role_permissions rp ON p.id = rp.permission_id 
            JOIN user_roles ur ON rp.role_id = ur.role_id 
            WHERE ur.user_id = $1
            ORDER BY p.code
        `, [userId]);

        console.log(`Nombre total de permissions effectives: ${res.rows.length}`);

        const objPerms = res.rows.filter(p => p.category === 'objectives');
        console.log(`Permissions objectifs (${objPerms.length}):`);
        objPerms.forEach(p => console.log(`  - ${p.code}`));

        const managePerm = res.rows.find(p => p.code === 'permissions.manage');
        console.log(`A la permission "permissions.manage": ${!!managePerm}`);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit();
    }
}

checkUserPerms();
