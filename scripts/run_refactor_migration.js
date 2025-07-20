const { pool } = require('../src/utils/database');
const fs = require('fs');
const path = require('path');

async function runRefactorMigration() {
    try {
        console.log('🔄 Exécution de la migration de refactorisation Business Units et Divisions...\n');

        // Lire le fichier de migration
        const migrationPath = path.join(__dirname, '../database/migrations/012_refactor_business_units_divisions.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📝 Contenu de la migration:');
        console.log(migrationSQL);
        console.log('');

        // Exécuter la migration
        console.log('🚀 Exécution des commandes SQL...');
        const result = await pool.query(migrationSQL);
        
        console.log('✅ Migration exécutée avec succès!');
        console.log('📊 Résultat:', result);

        // Vérifier la structure des tables
        console.log('\n🔍 Vérification de la structure des tables...');
        
        // Vérifier business_units
        const businessUnitsStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'business_units' 
            ORDER BY ordinal_position
        `);

        console.log('📋 Structure de la table business_units:');
        businessUnitsStructure.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });

        // Vérifier divisions
        const divisionsStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'divisions' 
            ORDER BY ordinal_position
        `);

        console.log('\n📋 Structure de la table divisions:');
        divisionsStructure.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });

        // Vérifier les données existantes
        console.log('\n📊 Vérification des données existantes...');
        
        const businessUnitsCount = await pool.query('SELECT COUNT(*) as count FROM business_units');
        console.log(`  - Business Units: ${businessUnitsCount.rows[0].count}`);
        
        const divisionsCount = await pool.query('SELECT COUNT(*) as count FROM divisions');
        console.log(`  - Divisions: ${divisionsCount.rows[0].count}`);

        console.log('\n🎉 Refactorisation terminée avec succès !');

    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution de la migration:', error);
    } finally {
        await pool.end();
    }
}

runRefactorMigration(); 