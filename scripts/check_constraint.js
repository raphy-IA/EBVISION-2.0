require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkConstraint() {
    const client = await pool.connect();
    try {
        console.log("--- TIME_SHEETS Check Constraints ---");
        const res = await client.query("SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'time_sheets'::regclass AND contype = 'c'");
        console.table(res.rows);

        console.log("\n--- TIME_ENTRIES Check Constraints ---");
        const res2 = await client.query("SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'time_entries'::regclass AND contype = 'c'");
        console.table(res2.rows);

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}

checkConstraint();
