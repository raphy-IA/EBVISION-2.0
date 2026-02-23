const { pool } = require('../src/utils/database');

async function mimicApi() {
    try {
        const roleId = '78b98c58-c282-489b-9d36-7584f990821e'; // SENIOR_PARTNER
        console.log(`--- SIMULATION API POUR RÔLE ${roleId} ---`);

        // Exact query from src/routes/permissions.js line 263
        const rolePermissionsResult = await pool.query(`
            SELECT p.id, p.code, p.name, p.description, p.category
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.role_id = $1
        `, [roleId]);

        console.log(`Nombre de permissions retournées par la requête API: ${rolePermissionsResult.rows.length}`);

        const objectivePerms = rolePermissionsResult.rows.filter(p => p.category === 'objectives');
        console.log(`Nombre de permissions d'objectifs: ${objectivePerms.length}`);
        objectivePerms.forEach(p => console.log(`- ${p.code} (ID: ${p.id})`));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit();
    }
}

mimicApi();
