require('dotenv').config();
const { pool } = require('../src/utils/database');
const fs = require('fs');
const path = require('path');

async function runMigration018() {
    try {
        console.log('🔄 Exécution de la migration 018...');
        
        const migrationPath = path.join(__dirname, '../database/migrations/018_fix_clients_table_final.sql');
        const sqlContent = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📄 Contenu de la migration:');
        console.log(sqlContent);
        
        // Exécuter la migration
        await pool.query(sqlContent);
        
        console.log('✅ Migration 018 exécutée avec succès !');
        
        // Vérifier la structure après migration
        console.log('\n🔍 Vérification de la structure après migration...');
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'clients' 
            ORDER BY ordinal_position;
        `);
        
        console.log('📋 Colonnes après migration:');
        result.rows.forEach((row, index) => {
            console.log(`${(index + 1).toString().padStart(2, '0')}. ${row.column_name.padEnd(25)} | ${row.data_type.padEnd(15)} | ${row.is_nullable}`);
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution de la migration:', error);
    } finally {
        await pool.end();
    }
}

runMigration018(); 