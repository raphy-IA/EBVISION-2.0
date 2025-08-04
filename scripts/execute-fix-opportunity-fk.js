const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function executeFixOpportunityFK() {
    const client = await pool.connect();
    try {
        console.log('🔧 Correction de la contrainte de clé étrangère opportunity_id...\n');

        // Lire le fichier de migration
        const migrationPath = path.join(__dirname, '../database/migrations/048_fix_opportunity_foreign_key.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Exécuter la migration
        await client.query('BEGIN');
        
        console.log('📋 Exécution de la correction...');
        await client.query(migrationSQL);
        
        await client.query('COMMIT');
        
        console.log('✅ Correction terminée avec succès !');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erreur lors de la correction:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

executeFixOpportunityFK(); 