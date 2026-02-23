
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
    const res = await client.query("SELECT code FROM permissions WHERE code LIKE 'menu.%' ORDER BY code");
    console.log(JSON.stringify(res.rows, null, 2));
    await client.end();
}

run().catch(console.error);
