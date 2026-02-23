
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

    const res = await client.query("SELECT * FROM permissions WHERE category = 'menu' ORDER BY code");
    fs.writeFileSync('all_menu_perms.json', JSON.stringify(res.rows, null, 2));
    console.log(`Wrote ${res.rows.length} rows to all_menu_perms.json`);

    await client.end();
}

run().catch(console.error);
