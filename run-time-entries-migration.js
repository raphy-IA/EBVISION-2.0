const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'trs_database',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

async function runMigration() {
    try {
        console.log('🚀 Début de l\'exécution de la migration time_entries...');
        
        // Lire le fichier de migration
        const migrationPath = path.join(__dirname, 'database', 'migrations', '060_create_time_entries.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📄 Fichier de migration lu avec succès');
        
        // Exécuter la migration
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            console.log('⚙️ Exécution des commandes SQL...');
            await client.query(migrationSQL);
            
            await client.query('COMMIT');
            console.log('✅ Migration time_entries exécutée avec succès!');
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Erreur lors de l\'exécution de la migration:', error.message);
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration(); 