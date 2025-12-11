const { pool } = require('../../src/utils/database');

async function check() {
    try {
        console.log('--- Checking Secteurs ---');
        const secteurs = await pool.query('SELECT id, nom, code FROM secteurs_activite');
        console.log(secteurs.rows);

        console.log('\n--- Checking Collaborateurs (Admin match test) ---');
        // Search for names appearing in CSV


        console.log('\n--- Checking Users (Admin match test) ---');
        // 'username' column does not exist, use 'login'
        const users = await pool.query("SELECT id, email, login FROM users WHERE email ILIKE '%roosevelt%' OR login ILIKE '%roosevelt%' OR email ILIKE '%emmanuelle%'");
        console.log(users.rows);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
