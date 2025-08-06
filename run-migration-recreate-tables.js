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

async function runMigration() {
    try {
        console.log('🔄 Début de la migration de recréation des tables time_sheets et time_entries...\n');

        // Test de connexion
        const testQuery = await pool.query('SELECT NOW() as current_time');
        console.log('✅ Connexion réussie. Heure actuelle:', testQuery.rows[0].current_time);
        console.log('');

        // Lire le fichier de migration
        const migrationPath = path.join(__dirname, 'migrations', '001_recreate_time_sheets_tables.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📋 Exécution de la migration...');
        console.log('=' .repeat(50));

        // Exécuter la migration
        await pool.query(migrationSQL);

        console.log('✅ Migration exécutée avec succès !');
        console.log('');

        // Vérifier que les tables ont été créées
        console.log('🔍 Vérification de la création des tables...');
        console.log('=' .repeat(50));

        const tablesQuery = `
            SELECT table_name, table_type
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('time_sheets', 'time_entries')
            ORDER BY table_name
        `;

        const tablesResult = await pool.query(tablesQuery);
        
        if (tablesResult.rows.length === 0) {
            console.log('❌ Aucune table trouvée');
        } else {
            console.log('✅ Tables créées:');
            tablesResult.rows.forEach(row => {
                console.log(`   - ${row.table_name} (${row.table_type})`);
            });
        }

        console.log('');

        // Vérifier la structure de la table time_sheets
        console.log('📋 Structure de la table time_sheets:');
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

        // Vérifier la structure de la table time_entries
        console.log('📋 Structure de la table time_entries:');
        console.log('=' .repeat(50));

        const timeEntriesStructureQuery = `
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'time_entries' 
            ORDER BY ordinal_position
        `;

        const timeEntriesStructureResult = await pool.query(timeEntriesStructureQuery);
        
        timeEntriesStructureResult.rows.forEach(row => {
            console.log(`${row.column_name.padEnd(20)} | ${row.data_type.padEnd(15)} | ${row.is_nullable.padEnd(8)} | ${(row.column_default || 'NULL').padEnd(15)}`);
        });

        console.log('');

        // Vérifier les contraintes
        console.log('🔒 Contraintes créées:');
        console.log('=' .repeat(50));

        const constraintsQuery = `
            SELECT 
                tc.table_name,
                tc.constraint_name,
                tc.constraint_type,
                kcu.column_name
            FROM information_schema.table_constraints tc
            LEFT JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_schema = 'public' 
            AND tc.table_name IN ('time_sheets', 'time_entries')
            ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name
        `;

        const constraintsResult = await pool.query(constraintsQuery);
        
        constraintsResult.rows.forEach(row => {
            console.log(`${row.table_name.padEnd(15)} | ${row.constraint_name.padEnd(30)} | ${row.constraint_type.padEnd(15)} | ${row.column_name || ''}`);
        });

        console.log('');
        console.log('🎉 Migration terminée avec succès !');
        console.log('');
        console.log('📝 Résumé des changements:');
        console.log('   ✅ Anciennes tables supprimées');
        console.log('   ✅ Nouvelle table time_sheets créée');
        console.log('   ✅ Nouvelle table time_entries créée');
        console.log('   ✅ Contraintes et index créés');
        console.log('   ✅ Triggers pour synchronisation automatique');
        console.log('   ✅ Fonctions utilitaires créées');

    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

runMigration(); 