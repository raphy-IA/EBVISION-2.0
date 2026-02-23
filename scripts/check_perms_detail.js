
const { Client } = require('pg');
const fs = require('fs');
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

    const res = await client.query("SELECT * FROM permissions WHERE code LIKE 'menu.gestion_rh.%' ORDER BY code");
    fs.writeFileSync('perms_check.json', JSON.stringify(res.rows, null, 2));
    console.log(`Wrote ${res.rows.length} rows to perms_check.json`);

    await client.end();
}

run().catch(console.error);
