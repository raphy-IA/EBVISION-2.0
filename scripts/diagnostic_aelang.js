const pool = require('../src/utils/database');

async function diagnostic(login) {
    try {
        // 1. User Info
        const u = await pool.query("SELECT id, login, nom, prenom FROM users WHERE login = $1", [login]);
        if (u.rows.length === 0) return console.log("User not found");
        const user = u.rows[0];

        // 2. Roles & Permissions
        const rolesRes = await pool.query(`
            SELECT r.name, r.id FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1
        `, [user.id]);
        const permissionsRes = await pool.query(`
            SELECT DISTINCT p.code 
            FROM role_permissions rp 
            JOIN permissions p ON rp.permission_id = p.id 
            JOIN user_roles ur ON ur.role_id = rp.role_id 
            WHERE ur.user_id = $1
        `, [user.id]);

        console.log('--- USER PROFILE ---');
        console.log('User:', user.login, '(', user.id, ')');
        console.log('Roles:', rolesRes.rows.map(r => r.name));
        console.log('Permissions:', permissionsRes.rows.map(p => p.code));

        // 3. Authorized BUs
        const buAccessRes = await pool.query(`
            SELECT DISTINCT bu.id, bu.nom
            FROM (
                SELECT business_unit_id FROM user_business_unit_access WHERE user_id = $1 AND granted = true
                UNION
                SELECT business_unit_id FROM collaborateurs WHERE user_id = $1 AND business_unit_id IS NOT NULL
            ) bu_ids
            JOIN business_units bu ON bu_ids.business_unit_id = bu.id
        `, [user.id]);
        const buIds = buAccessRes.rows.map(r => r.id);
        console.log('\n--- AUTHORIZED BUs ---');
        console.log(buAccessRes.rows);

        // 4. Real Data Check (Current FY)
        const fyRes = await pool.query("SELECT id, libelle FROM fiscal_years WHERE statut = 'ACTIVE' LIMIT 1");
        if (fyRes.rows.length === 0) {
            console.log("No active fiscal year found, checking all...");
            const allFy = await pool.query("SELECT id, libelle, statut FROM fiscal_years");
            console.log(allFy.rows);
            return;
        }
        const fy = fyRes.rows[0];
        console.log('\n--- DATA CHECK (FY:', fy.libelle, ') ---');

        const buObjCount = await pool.query(`
            SELECT COUNT(*) 
            FROM business_unit_objectives buo
            JOIN global_objectives go ON buo.global_objective_id = go.id
            WHERE go.fiscal_year_id = $1 AND buo.business_unit_id = ANY($2)
        `, [fy.id, buIds]);

        console.log('Count of BU Objectives for these BUs:', buObjCount.rows[0].count);

        // Individual BU check
        for (const bu of buAccessRes.rows) {
            const count = await pool.query(`
                SELECT COUNT(*) FROM business_unit_objectives buo
                JOIN global_objectives go ON buo.global_objective_id = go.id
                WHERE go.fiscal_year_id = $1 AND buo.business_unit_id = $2
            `, [fy.id, bu.id]);
            console.log(`- BU ${bu.nom} has ${count.rows[0].count} objectives`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

diagnostic('aelang');
