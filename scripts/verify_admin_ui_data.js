const { pool } = require('../src/utils/database');

async function verify() {
    try {
        console.log('--- VERIFICATION DES PERMISSIONS DU RÔLE SENIOR_PARTNER ---');

        const res = await pool.query(`
            SELECT p.code, p.name 
            FROM role_permissions rp 
            JOIN roles r ON rp.role_id = r.id 
            JOIN permissions p ON rp.permission_id = p.id 
            WHERE r.name = 'SENIOR_PARTNER' AND p.category = 'objectives'
            ORDER BY p.code
        `);

        console.log(`Nombre de permissions d'objectifs trouvées: ${res.rows.length}`);
        res.rows.forEach(r => console.log(`- ${r.code}: ${r.name}`));

        // Check the total count of objective permissions
        const totalRes = await pool.query("SELECT COUNT(*) FROM permissions WHERE category = 'objectives'");
        console.log(`Total de permissions d'objectifs en base: ${totalRes.rows[0].count}`);

    } catch (e) {
        console.error('❌ Erreur:', e);
    } finally {
        await pool.end();
        process.exit();
    }
}

verify();
