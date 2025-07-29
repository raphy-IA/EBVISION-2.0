const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration de la base de données
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'trs_affichage',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function runMigration() {
    try {
        console.log('🔗 Connexion à la base de données...');
        
        // Lire le fichier de migration
        const migrationPath = path.join(__dirname, '../database/migrations/020_create_opportunity_stages.sql');
        const migration = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📄 Exécution de la migration 020_create_opportunity_stages.sql...');
        
        // Exécuter la migration
        await pool.query(migration);
        
        console.log('✅ Migration exécutée avec succès !');
        console.log('📋 Tables créées :');
        console.log('   - opportunity_stages');
        console.log('   - stage_validations');
        console.log('   - stage_documents');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution de la migration:', error.message);
        if (error.detail) {
            console.error('   Détail:', error.detail);
        }
    } finally {
        await pool.end();
        console.log('🔌 Connexion fermée');
    }
}

runMigration(); 