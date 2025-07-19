const fs = require('fs');
const path = require('path');
const { pool } = require('../src/utils/database');

async function runFixMigration() {
    try {
        console.log('🔧 Exécution de la migration de correction 008_fix_clients_table.sql...');
        
        // Lire le fichier de migration
        const migrationPath = path.join(__dirname, '../database/migrations/008_fix_clients_table.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Exécuter la migration
        await pool.query(migrationSQL);
        
        console.log('✅ Migration de correction exécutée avec succès');
        
        // Vérifier la structure de la table clients
        const columns = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'clients' 
            ORDER BY ordinal_position
        `);
        
        console.log('📋 Structure de la table clients:');
        columns.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution de la migration de correction:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

runFixMigration().catch(console.error); 