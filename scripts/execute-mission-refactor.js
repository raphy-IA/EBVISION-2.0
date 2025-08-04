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

async function executeMissionRefactor() {
    const client = await pool.connect();
    try {
        console.log('🔄 Exécution de la refactorisation de la table missions...\n');

        // Lire le fichier de migration
        const migrationPath = path.join(__dirname, '../database/migrations/047_refactor_missions_structure.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Exécuter la migration
        await client.query('BEGIN');
        
        console.log('📋 Exécution des modifications de structure...');
        await client.query(migrationSQL);
        
        await client.query('COMMIT');
        
        console.log('✅ Refactorisation terminée avec succès !');
        
        // Vérifier la nouvelle structure
        console.log('\n📊 Nouvelle structure de la table missions:');
        const structureQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'missions' 
            ORDER BY ordinal_position
        `;
        const structureResult = await client.query(structureQuery);
        
        console.table(structureResult.rows.map(row => ({
            'Colonne': row.column_name,
            'Type': row.data_type,
            'Nullable': row.is_nullable,
            'Défaut': row.column_default
        })));

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erreur lors de la refactorisation:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

executeMissionRefactor(); 