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

async function checkClients() {
    try {
        console.log(`Checking 'clients' in ${process.env.DB_NAME}...`);

        // Check if nullable
        const resNullable = await pool.query(`
            SELECT is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'clients' AND column_name = 'updated_by'
        `);
        console.log('Is updated_by nullable:', resNullable.rows[0]?.is_nullable);

        // Check existing values for new columns
        const resValues = await pool.query(`
            SELECT id, nom, secteur_activite, administrateur_nom, contact_interne_nom, notes, updated_by
            FROM clients 
            WHERE administrateur_nom IS NOT NULL OR secteur_activite = 'Miscellaneous'
            LIMIT 5
        `);
        console.log('Sample updated clients:', resValues.rows);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkClients();
