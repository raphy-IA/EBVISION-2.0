require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkTimesheets() {
    const client = await pool.connect();
    try {
        console.log('--- TIME_SHEETS ---');
        let res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'time_sheets' ORDER BY column_name");
        console.log(res.rows.map(r => r.column_name).join(', '));

        console.log('\n--- TIME_ENTRIES ---');
        res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'time_entries' ORDER BY column_name");
        console.log(res.rows.map(r => r.column_name).join(', '));
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}

checkTimesheets();
