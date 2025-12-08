require('dotenv').config();
const { Pool } = require('pg');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '../backups/Migration/db_collaborateurs_export.csv');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function exportUsers() {
    const client = await pool.connect();
    try {
        console.log('📤 Exporting DB Collaborators...');
        const res = await client.query('SELECT id, nom, prenom, email FROM collaborateurs ORDER BY nom, prenom');

        const csvWriter = createObjectCsvWriter({
            path: OUTPUT_FILE,
            header: [
                { id: 'id', title: 'ID' },
                { id: 'nom', title: 'Nom' },
                { id: 'prenom', title: 'Prenom' },
                { id: 'email', title: 'Email' }
            ]
        });

        await csvWriter.writeRecords(res.rows);
        console.log(`✅ Exported ${res.rows.length} users to ${OUTPUT_FILE}`);
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}

exportUsers();
