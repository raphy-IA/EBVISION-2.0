const { pool } = require('./src/utils/database');
const fs = require('fs');
const path = require('path');

async function runMigration016() {
    try {
        console.log('🚀 Exécution manuelle de la migration 016...');
        
        // Lire le fichier de migration
        const migrationPath = path.join(__dirname, 'database', 'migrations', '016_enrich_clients_table.sql');
        const migrationContent = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📄 Contenu de la migration lu');
        
        // Exécuter la migration
        console.log('⚡ Exécution de la migration...');
        await pool.query(migrationContent);
        
        console.log('✅ Migration 016 exécutée avec succès');
        
        // Vérifier que les colonnes ont été ajoutées
        const structureQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'clients'
            ORDER BY ordinal_position;
        `;
        
        const structure = await pool.query(structureQuery);
        console.log('📊 Colonnes après migration:');
        structure.rows.forEach(col => {
            console.log(`  - ${col.column_name}`);
        });
        
        console.log(`📈 Nombre total de colonnes: ${structure.rows.length}`);
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution de la migration:', error);
        console.error('Détail:', error.detail);
        console.error('Code:', error.code);
    } finally {
        await pool.end();
    }
}

runMigration016(); 