require('dotenv').config();
const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function dump() {
    const client = await pool.connect();
    try {
        const res = await client.query("SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'time_sheets'::regclass AND contype = 'c'");
        const res2 = await client.query("SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'time_entries'::regclass AND contype = 'c'");

        const data = JSON.stringify({ sheets: res.rows, entries: res2.rows }, null, 2);
        fs.writeFileSync('constraint.txt', data);
        console.log('Dumped to constraint.txt');
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}

dump();
