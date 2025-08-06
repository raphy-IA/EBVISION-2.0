const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement
require('dotenv').config();

// Configuration de la base de données
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
});

async function runFixMigration() {
    try {
        console.log('🔄 Début de la migration de correction des tables...\n');

        // Test de connexion
        const testQuery = await pool.query('SELECT NOW() as current_time');
        console.log('✅ Connexion réussie. Heure actuelle:', testQuery.rows[0].current_time);
        console.log('');

        // Lire le fichier de migration
        const migrationPath = path.join(__dirname, 'migrations', '002_fix_time_sheets_missing_columns.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📋 Exécution de la migration de correction...');
        console.log('=' .repeat(50));

        // Exécuter la migration
        await pool.query(migrationSQL);

        console.log('✅ Migration de correction exécutée avec succès !');
        console.log('');

        // Vérifier la structure finale de time_sheets
        console.log('📋 Structure finale de la table time_sheets:');
        console.log('=' .repeat(50));

        const timeSheetsStructureQuery = `
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'time_sheets' 
            ORDER BY ordinal_position
        `;

        const timeSheetsStructureResult = await pool.query(timeSheetsStructureQuery);
        
        timeSheetsStructureResult.rows.forEach(row => {
            console.log(`${row.column_name.padEnd(20)} | ${row.data_type.padEnd(15)} | ${row.is_nullable.padEnd(8)} | ${(row.column_default || 'NULL').padEnd(15)}`);
        });

        console.log('');
        console.log('🎉 Migration de correction terminée avec succès !');
        console.log('');
        console.log('📝 Résumé des corrections:');
        console.log('   ✅ Colonne statut ajoutée à time_sheets');
        console.log('   ✅ Colonne notes_rejet ajoutée à time_sheets');
        console.log('   ✅ Colonne validateur_id ajoutée à time_sheets');
        console.log('   ✅ Colonne date_validation ajoutée à time_sheets');
        console.log('   ✅ Contrainte unique user_id + week_start ajoutée');
        console.log('   ✅ Index et triggers vérifiés/créés');

    } catch (error) {
        console.error('❌ Erreur lors de la migration de correction:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

runFixMigration(); 