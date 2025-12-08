require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function check() {
    const client = await pool.connect();
    try {
        const tables = ['clients'];

        for (const table of tables) {
            console.log(`\n--- TABLE: ${table} ---`);
            const res = await client.query(`
                SELECT column_name, data_type, is_nullable, column_default 
                FROM information_schema.columns 
                WHERE table_name = $1 
                ORDER BY ordinal_position
            `, [table]);

            res.rows.forEach(r => {
                console.log(`  ${r.column_name.padEnd(20)} | ${r.data_type.padEnd(15)} | Nullable: ${r.is_nullable} | Default: ${r.column_default}`);
            });
        }
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}
check();
