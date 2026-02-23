
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function simulateApi() {
    const client = await pool.connect();
    try {
        const allPermissionsResult = await client.query(`
        SELECT id, code, name, description, category
        FROM permissions p
        ORDER BY category, name
    `);

        const perms = allPermissionsResult.rows;
        const gestionRhPerms = perms.filter(p => p.code && p.code.startsWith('menu.gestion_rh.'));

        fs.writeFileSync('api_sim_result.json', JSON.stringify({
            total: perms.length,
            gestion_rh: gestionRhPerms
        }, null, 2));

        console.log(`Saved ${gestionRhPerms.length} Gestion RH permissions to api_sim_result.json`);

    } finally {
        client.release();
        await pool.end();
    }
}

simulateApi().catch(console.error);
