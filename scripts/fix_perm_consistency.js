
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

    const code = 'menu.gestion_rh.configuration_objectifs';
    const name = 'Menu: Configuration des Objectifs';
    const description = `Permission d'accès au menu ${code}`;

    const res = await client.query(
        "UPDATE permissions SET name = $1, description = $2 WHERE code = $3 RETURNING *",
        [name, description, code]
    );

    if (res.rowCount > 0) {
        console.log('✅ Permission mise à jour avec succès');
        console.log(JSON.stringify(res.rows[0], null, 2));
    } else {
        console.log('❌ Permission non trouvée');
    }

    await client.end();
}

run().catch(console.error);
