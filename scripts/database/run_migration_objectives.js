const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('🚀 Démarrage de la migration des objectifs stratégiques...');
        
        const migrationPath = path.join(__dirname, '../migrations/008_create_strategic_objectives_table.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📄 Lecture du fichier SQL :', migrationPath);
        
        await client.query('BEGIN');
        
        await client.query(sql);
        
        await client.query('COMMIT');
        
        console.log('✅ Migration terminée avec succès !');
        console.log('   - Table strategic_objectives créée');
        console.log('   - Données initiales insérées');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erreur lors de la migration :', error);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
