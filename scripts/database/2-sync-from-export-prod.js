const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { syncAllPermissions } = require('./sync-all-permissions-complete');

/**
 * SCRIPT 2/2: Synchronisation de la production depuis l'export
 * À exécuter EN PRODUCTION uniquement
 * Lit: schema-export.json
 * Compare avec la base locale (production) et corrige les différences
 * Synchronise ensuite les permissions.
 */

const pool = new Pool({
    user: process.env.DB_USER || 'ebvision_user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'ebvision_2_0',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function getCurrentSchema() {
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
    const schema = {};

    result.rows.forEach(row => {
        schema[row.table_name] = {
            columns: row.columns || []
        };
    });

    return schema;
}

function compareSchemas(referenceSchema, currentSchema) {
    const differences = [];
    let totalTablesChecked = 0;
    let totalColumnsChecked = 0;

    // Pour chaque table de référence
    for (const tableName in referenceSchema.tables) {
        totalTablesChecked++;
        const refTable = referenceSchema.tables[tableName];
        const currentTable = currentSchema[tableName];

        if (!currentTable) {
            differences.push({
                type: 'MISSING_TABLE',
                table: tableName,
                action: `-- TODO: CREATE TABLE ${tableName} (migration requise)`
            });
            continue;
        }

        // Créer un map des colonnes actuelles
        const currentColMap = {};
        currentTable.columns.forEach(col => {
            currentColMap[col.column_name] = col;
        });

        // Vérifier chaque colonne de référence
        refTable.columns.forEach(refCol => {
            totalColumnsChecked++;
            const currentCol = currentColMap[refCol.column_name];

            if (!currentCol) {
                // Colonne manquante
                let colDef = refCol.data_type;
                if (refCol.character_maximum_length) {
                    colDef += `(${refCol.character_maximum_length})`;
                }

                let nullable = refCol.is_nullable === 'YES' ? '' : ' NOT NULL';
                let defaultVal = refCol.column_default ? ` DEFAULT ${refCol.column_default}` : '';

                differences.push({
                    type: 'MISSING_COLUMN',
                    table: tableName,
                    column: refCol.column_name,
                    action: `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${refCol.column_name} ${colDef}${nullable}${defaultVal};`
                });
            }
        });
    }

    console.log(`   📊 ${totalTablesChecked} tables vérifiées`);
    console.log(`   📊 ${totalColumnsChecked} colonnes comparées\n`);

    return differences;
}

async function applyFixes(differences) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        for (const diff of differences) {
            if (diff.type === 'MISSING_COLUMN') {
                console.log(`   🔧 ${diff.table}.${diff.column}`);
                await client.query(diff.action);
            }
        }

        await client.query('COMMIT');
        console.log('✅ Corrections appliquées avec succès!\n');

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function syncFromExport() {
    console.log('\n🔄 SYNCHRONISATION DEPUIS L\'EXPORT LOCAL');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    try {
        // Charger le schéma de référence
        const exportPath = path.join(__dirname, 'schema-export.json');

        if (!fs.existsSync(exportPath)) {
            console.error('❌ Fichier schema-export.json introuvable!');
            console.log('💡 Exécutez d\'abord en local: node scripts/database/1-export-schema-local.js\n');
            process.exit(1);
        }

        console.log('📥 Chargement du schéma de référence...');
        const referenceSchema = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
        console.log(`   ✅ ${referenceSchema.total_tables} tables de référence\n`);

        console.log('📥 Récupération du schéma de production...');
        const currentSchema = await getCurrentSchema();
        console.log(`   ✅ ${Object.keys(currentSchema).length} tables en production\n`);

        console.log('🔍 Comparaison des schémas...');
        const differences = compareSchemas(referenceSchema, currentSchema);

        if (differences.length === 0) {
            console.log('✅ Aucune différence de schéma détectée.\n');
        } else {
            console.log(`⚠️  ${differences.length} différence(s) détectée(s):\n`);

            const missingTables = differences.filter(d => d.type === 'MISSING_TABLE');
            const missingColumns = differences.filter(d => d.type === 'MISSING_COLUMN');

            if (missingTables.length > 0) {
                console.log(`❌ Tables manquantes: ${missingTables.length}`);
                missingTables.forEach(d => console.log(`   - ${d.table}`));
                console.log('   ⚠️  Ces tables nécessitent une migration complète\n');
            }

            // Demander confirmation et appliquer seulement si colonnes manquantes
            if (missingColumns.length > 0) {
                console.log(`🔧 Colonnes manquantes: ${missingColumns.length}`);
                missingColumns.forEach(d => console.log(`   - ${d.table}.${d.column}`));

                console.log('\n🚀 Application des corrections de schéma...');
                await applyFixes(missingColumns);
            }
        }

        // =================================================================
        // SYNCHRONISATION DES PERMISSIONS
        // =================================================================
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('🛡️  SYNCHRONISATION DES PERMISSIONS');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        // Note: syncAllPermissions gère sa propre connexion DB
        await syncAllPermissions();

        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('✅ SYNCHRONISATION GLOBALE TERMINÉE (SCHEMA + PERMISSIONS)!\n');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

syncFromExport().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
});
