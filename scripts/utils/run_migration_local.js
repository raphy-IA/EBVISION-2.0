const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function runSqlFile() {
    try {
        console.log(`🔌 Connexion à ${process.env.DB_NAME}...`);
        const sqlPath = path.join(__dirname, '../../migrations/100_add_client_contact_fields.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('📜 Exécution du script SQL...');
        await pool.query(sql);
        console.log('✅ Migration SQL appliquée avec succès.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Erreur lors de la migration:', e);
        process.exit(1);
    }
}

runSqlFile();
