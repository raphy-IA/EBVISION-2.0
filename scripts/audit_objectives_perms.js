const { pool } = require('../src/utils/database');

async function audit() {
    try {
        console.log('--- AUDIT DES PERMISSIONS OBJECTIFS ---');
        const res = await pool.query("SELECT id, code, name, category FROM permissions WHERE category = 'objectives' ORDER BY code");
        console.log(`ID | CODE | NAME | CATEGORY`);
        console.log('-'.repeat(80));
        res.rows.forEach(r => {
            console.log(`${r.id} | ${r.code} | ${r.name} | ${r.category}`);
        });

        console.log('\n--- VERIFICATION DES ASSIGNATIONS AU RÔLE SENIOR_PARTNER ---');
        const roleRes = await pool.query("SELECT id FROM roles WHERE name = 'SENIOR_PARTNER'");
        const roleId = roleRes.rows[0].id;
        console.log(`Role SENIOR_PARTNER ID: ${roleId}`);

        const assignments = await pool.query(`
            SELECT p.id, p.code 
            FROM role_permissions rp 
            JOIN permissions p ON rp.permission_id = p.id 
            WHERE rp.role_id = $1 AND p.category = 'objectives'
        `, [roleId]);

        console.log(`Nombre d'assignations: ${assignments.rows.length}`);
        assignments.rows.forEach(a => console.log(`- Role a la permission ID: ${a.id} (${a.code})`));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit();
    }
}

audit();
