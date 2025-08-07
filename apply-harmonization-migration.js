const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'eb_vision_2_0',
    user: 'postgres',
    password: 'Canaan@2020'
});

async function applyHarmonizationMigration() {
    try {
        console.log('🔄 Application de la migration d\'harmonisation...\n');
        
        // Lire le fichier de migration
        const migrationPath = path.join(__dirname, 'database', 'migrations', '063_harmonize_time_entries_status.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📋 Contenu de la migration:');
        console.log(migrationSQL);
        console.log('\n🚀 Application de la migration...\n');
        
        // Exécuter la migration
        await pool.query(migrationSQL);
        
        console.log('✅ Migration appliquée avec succès !');
        
        // Vérifier le résultat
        console.log('\n🔍 Vérification du résultat...');
        
        const structureResult = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'time_entries' AND column_name = 'status';
        `);
        
        console.log('📋 Nouvelle structure de la colonne status:');
        structureResult.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? 'DEFAULT ' + row.column_default : ''}`);
        });
        
        const constraintResult = await pool.query(`
            SELECT constraint_name, check_clause 
            FROM information_schema.check_constraints 
            WHERE constraint_name = 'time_entries_status_check';
        `);
        
        console.log('\n🔍 Nouvelle contrainte:');
        constraintResult.rows.forEach(row => {
            console.log(`  ${row.constraint_name}: ${row.check_clause}`);
        });
        
        const valuesResult = await pool.query(`
            SELECT status, COUNT(*) as count 
            FROM time_entries 
            GROUP BY status 
            ORDER BY count DESC;
        `);
        
        console.log('\n📊 Valeurs actuelles:');
        valuesResult.rows.forEach(row => {
            console.log(`  ${row.status}: ${row.count} entrées`);
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'application de la migration:', error);
    } finally {
        await pool.end();
    }
}

applyHarmonizationMigration();
