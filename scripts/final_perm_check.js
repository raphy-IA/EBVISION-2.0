const { pool } = require('../src/utils/database');

async function finalCheck() {
    try {
        const roleId = '78b98c58-c282-489d-9d36-7584f990821e'; // SENIOR_PARTNER
        console.log(`--- VERIFICATION FINALE POUR LE RÔLE ID: ${roleId} ---`);

        const res = await pool.query(`
            SELECT p.id, p.code, p.category 
            FROM role_permissions rp 
            JOIN permissions p ON rp.permission_id = p.id 
            WHERE rp.role_id = $1
            ORDER BY p.code
        `, [roleId]);

        console.log(`Nombre total de permissions pour ce rôle: ${res.rows.length}`);

        const objPerms = res.rows.filter(p => p.category === 'objectives');
        console.log(`Permissions objectifs (${objPerms.length}):`);
        objPerms.forEach(p => console.log(`  - ${p.code} [${p.id}]`));

        // Check for duplicates in permissions table
        console.log('\n--- VERIFICATION DES DOUBLONS DE CODES ---');
        const dupCheck = await pool.query("SELECT code, COUNT(*) FROM permissions GROUP BY code HAVING COUNT(*) > 1");
        if (dupCheck.rows.length > 0) {
            console.log('Doublons trouvés:');
            dupCheck.rows.forEach(d => console.log(`  - ${d.code}: ${d.count}`));
        } else {
            console.log('Aucun doublon de code trouvé.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit();
    }
}

finalCheck();
