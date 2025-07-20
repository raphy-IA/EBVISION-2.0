const { pool } = require('../src/utils/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('🚀 Exécution de la migration 009_add_posts_and_rates.sql...');
        
        const migrationPath = path.join(__dirname, '../database/migrations/009_add_posts_and_rates.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📊 Exécution des requêtes SQL...');
        await pool.query(migrationSQL);
        
        console.log('✅ Migration 009 exécutée avec succès !');
        
        // Vérifier que les tables ont été créées
        const tables = ['types_collaborateurs', 'postes', 'taux_horaires', 'evolution_postes'];
        for (const table of tables) {
            const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
            console.log(`📋 Table ${table}: ${result.rows[0].count} enregistrements`);
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution de la migration:', error.message);
    } finally {
        await pool.end();
    }
}

runMigration(); 