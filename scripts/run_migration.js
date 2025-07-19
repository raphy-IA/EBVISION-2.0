const fs = require('fs');
const path = require('path');
const { pool } = require('../src/utils/database');

async function runMigration() {
    try {
        console.log('🔧 Exécution de la migration 007_create_clients_missions.sql...');
        
        // Lire le fichier de migration
        const migrationPath = path.join(__dirname, '../database/migrations/007_create_clients_missions.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Exécuter la migration
        await pool.query(migrationSQL);
        
        console.log('✅ Migration exécutée avec succès');
        
        // Vérifier que les tables ont été créées
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('clients', 'missions', 'equipes_mission', 'opportunites')
            ORDER BY table_name
        `);
        
        console.log('📋 Tables créées:', tables.rows.map(row => row.table_name));
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution de la migration:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

runMigration().catch(console.error); 