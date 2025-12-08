require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkRoles() {
    const client = await pool.connect();
    try {
        console.log("--- Existing Roles ---");
        const roles = await client.query("SELECT DISTINCT role FROM users");
        console.log(roles.rows.map(r => r.role));

        console.log("--- Constraint Dump ---");
        const res = await client.query("SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'users'::regclass AND conname = 'users_role_check'");
        const fs = require('fs');
        fs.writeFileSync('users_constraint.txt', JSON.stringify(res.rows, null, 2));
        console.log("Dumped to users_constraint.txt");

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}

checkRoles();
