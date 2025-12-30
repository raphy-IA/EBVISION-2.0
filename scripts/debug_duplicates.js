const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function main() {
    const client = await pool.connect();
    try {
        console.log('--- checking for duplicate collaborators (same name or email) ---');

        // Check for duplicate names
        const duplicateNames = await client.query(`
            SELECT nom, prenom, COUNT(*) 
            FROM collaborateurs 
            GROUP BY nom, prenom 
            HAVING COUNT(*) > 1
        `);

        if (duplicateNames.rows.length > 0) {
            console.log('WARNING: Found duplicate collaborator names:');
            console.table(duplicateNames.rows);
            // Details
            for (const dup of duplicateNames.rows) {
                const details = await client.query('SELECT id, nom, prenom, email, user_id FROM collaborateurs WHERE nom = $1 AND prenom = $2', [dup.nom, dup.prenom]);
                console.table(details.rows);
            }
        } else {
            console.log('No duplicate collaborator names found.');
        }

        console.log('\n--- checking for duplicate users (same email) ---');
        const duplicateEmails = await client.query(`
            SELECT email, COUNT(*) 
            FROM users 
            GROUP BY email 
            HAVING COUNT(*) > 1
        `);

        if (duplicateEmails.rows.length > 0) {
            console.log('WARNING: Found duplicate user emails:');
            console.table(duplicateEmails.rows);
        } else {
            console.log('No duplicate user emails found.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
