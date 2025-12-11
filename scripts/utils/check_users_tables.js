const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkTables() {
    try {
        console.log(`Checking 'utilisateurs' and 'users' in ${process.env.DB_NAME}...`);

        const resUsers = await pool.query(`SELECT count(*) FROM users`);
        console.log('Count users:', resUsers.rows[0].count);

        const resUtilisateurs = await pool.query(`SELECT count(*) FROM utilisateurs`);
        console.log('Count utilisateurs:', resUtilisateurs.rows[0].count);

        // Fetch one from utilisateurs to see structure
        const resUtilisateursSample = await pool.query(`SELECT * FROM utilisateurs LIMIT 1`);
        console.log('Sample utilisateurs:', resUtilisateursSample.rows[0]);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkTables();
