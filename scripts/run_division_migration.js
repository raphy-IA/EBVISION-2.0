const { pool } = require('../src/utils/database');
const fs = require('fs');
const path = require('path');

async function runDivisionMigration() {
    try {
        console.log('🔄 Exécution de la migration de simplification de la table divisions...\n');

        // Lire le fichier de migration
        const migrationPath = path.join(__dirname, '../database/migrations/011_simplify_divisions_table.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📝 Contenu de la migration:');
        console.log(migrationSQL);
        console.log('');

        // Exécuter la migration
        console.log('🚀 Exécution des commandes SQL...');
        const result = await pool.query(migrationSQL);
        
        console.log('✅ Migration exécutée avec succès!');
        console.log('📊 Résultat:', result);

        // Vérifier la structure de la table
        console.log('\n🔍 Vérification de la structure de la table divisions...');
        const structureResult = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'divisions' 
            ORDER BY ordinal_position
        `);

        console.log('📋 Structure actuelle de la table divisions:');
        structureResult.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });

    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution de la migration:', error);
    } finally {
        await pool.end();
    }
}

runDivisionMigration(); 