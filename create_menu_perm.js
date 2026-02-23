
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function run() {
    await client.connect();

    // 1. Check if permission exists
    const permRes = await client.query("SELECT id FROM permissions WHERE code = 'menu.gestion_rh.configuration_objectifs'");
    let permId;

    if (permRes.rows.length === 0) {
        console.log('Creating permission: menu.gestion_rh.configuration_objectifs');
        // We use common columns. Based on list_columns.js: id, code, name, description, category, created_at, updated_at, nom, module
        const insertPerm = await client.query(
            "INSERT INTO permissions (code, name, category, created_at, updated_at, nom) VALUES ($1, $2, $3, NOW(), NOW(), $4) RETURNING id",
            ['menu.gestion_rh.configuration_objectifs', 'Configuration des Objectifs', 'menu', 'Configuration des Objectifs']
        );
        permId = insertPerm.rows[0].id;
    } else {
        console.log('Permission already exists.');
        permId = permRes.rows[0].id;
    }

    // 2. Assign to ADMIN_IT role
    const roleRes = await client.query("SELECT id FROM roles WHERE name = 'ADMIN_IT' OR name = 'SUPER_ADMIN'");
    for (const role of roleRes.rows) {
        const rolePermRes = await client.query(
            "SELECT 1 FROM role_permissions WHERE role_id = $1 AND permission_id = $2",
            [role.id, permId]
        );
        if (rolePermRes.rows.length === 0) {
            console.log(`Assigning permission to role: ${role.name} (${role.id})`);
            // Following schema: id, role_id, permission_id, created_at
            await client.query(
                "INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES ($1, $2, NOW())",
                [role.id, permId]
            );
        }
    }

    console.log('Permission setup complete.');
    await client.end();
}

run().catch(console.error);
