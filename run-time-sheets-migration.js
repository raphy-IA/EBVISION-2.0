require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
});

async function runTimeSheetsMigration() {
    try {
        console.log('🚀 Début de l\'exécution de la migration time_sheets...');
        
        // Lire le fichier de migration
        const migrationPath = path.join(__dirname, 'database', 'migrations', '061_create_time_sheets.sql');
        
        if (!fs.existsSync(migrationPath)) {
            console.error('❌ Fichier de migration non trouvé:', migrationPath);
            return;
        }
        
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log('📄 Fichier de migration lu avec succès');
        
        // Exécuter la migration
        await pool.query(migrationSQL);
        console.log('✅ Migration time_sheets exécutée avec succès');
        
        // Vérifier que la table a été créée
        const checkQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'time_sheets'
            ) as table_exists
        `;
        
        const result = await pool.query(checkQuery);
        
        if (result.rows[0].table_exists) {
            console.log('✅ Table time_sheets créée avec succès');
            
            // Afficher la structure de la table
            const structureQuery = `
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'time_sheets'
                ORDER BY ordinal_position
            `;
            
            const structureResult = await pool.query(structureQuery);
            console.log('📋 Structure de la table time_sheets:');
            structureResult.rows.forEach(row => {
                console.log(`  - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
            });
            
        } else {
            console.error('❌ La table time_sheets n\'a pas été créée');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution de la migration:', error);
    } finally {
        await pool.end();
    }
}

runTimeSheetsMigration(); 