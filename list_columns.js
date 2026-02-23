
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

    console.log('--- permissions ---');
    const res1 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'permissions'");
    console.log(res1.rows.map(r => r.column_name));

    console.log('--- role_permissions ---');
    const res2 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'role_permissions'");
    console.log(res2.rows.map(r => r.column_name));

    await client.end();
}

run().catch(console.error);
