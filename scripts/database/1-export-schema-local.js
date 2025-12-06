const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * SCRIPT 1/2: Export du schéma complet de la base locale
 * À exécuter EN LOCAL uniquement
 * Génère: schema-export.json
 */

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'EB-PostProd1',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function exportSchema() {
    console.log('\n📦 EXPORT DU SCHÉMA COMPLET DE LA BASE LOCALE');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    try {
        // Récupérer toutes les tables avec leurs colonnes
        const query = `
            SELECT 
                t.table_name,
                json_agg(
                    json_build_object(
                        'column_name', c.column_name,
                        'data_type', c.data_type,
                        'character_maximum_length', c.character_maximum_length,
                        'is_nullable', c.is_nullable,
                        'column_default', c.column_default,
                        'ordinal_position', c.ordinal_position
                    ) ORDER BY c.ordinal_position
                ) as columns
            FROM information_schema.tables t
            LEFT JOIN information_schema.columns c 
                ON t.table_name = c.table_name 
                AND t.table_schema = c.table_schema
            WHERE t.table_schema = 'public'
                AND t.table_type = 'BASE TABLE'
            GROUP BY t.table_name
            ORDER BY t.table_name
        `;

        const result = await pool.query(query);

        const schema = {
            exported_at: new Date().toISOString(),
            database: process.env.DB_NAME || 'EB-PostProd1',
            total_tables: result.rows.length,
            tables: {}
        };

        result.rows.forEach(row => {
            schema.tables[row.table_name] = {
                columns: row.columns || []
            };
        });

        // Sauvegarder dans un fichier JSON
        const outputPath = path.join(__dirname, 'schema-export.json');
        fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2));

        console.log(`✅ Schéma exporté avec succès!`);
        console.log(`   📋 Tables: ${schema.total_tables}`);
        console.log(`   💾 Fichier: ${outputPath}`);
        console.log(`   📏 Taille: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB\n`);

        console.log('📤 PROCHAINES ÉTAPES:');
        console.log('   1. Commiter ce fichier: git add scripts/database/schema-export.json');
        console.log('   2. git commit -m "chore: Update schema export"');
        console.log('   3. git push origin main');
        console.log('   4. Sur le serveur: git pull && node scripts/database/sync-from-export.js\n');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

exportSchema().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
});
