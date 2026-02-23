
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

    console.log('--- Permission Check ---');
    const permRes = await client.query("SELECT * FROM permissions WHERE code = 'menu.gestion_rh.configuration_objectifs'");
    console.log('Permission:', JSON.stringify(permRes.rows, null, 2));

    if (permRes.rows.length > 0) {
        console.log('--- Role Assignments ---');
        const rolePermRes = await client.query(`
      SELECT r.name, rp.* 
      FROM role_permissions rp 
      JOIN roles r ON rp.role_id = r.id 
      WHERE rp.permission_id = $1
    `, [permRes.rows[0].id]);
        console.log('Assignments:', JSON.stringify(rolePermRes.rows, null, 2));
    }

    await client.end();
}

run().catch(console.error);
