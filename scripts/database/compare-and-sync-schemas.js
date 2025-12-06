const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

/**
 * Script de comparaison et synchronisation COMPLÈTE des schémas
 * Compare TOUTES les tables entre local et production
 * Génère SEULEMENT les ALTER statements nécessaires
 */

// Configuration base locale
const localPool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'EB-PostProd1',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

// Configuration base production (à lire depuis .env.production si disponible)
const productionPool = new Pool({
    user: process.env.PROD_DB_USER || 'ebvision_user',
    host: process.env.PROD_DB_HOST || 'localhost',
    database: process.env.PROD_DB_NAME || 'ebvision_2_0',
    password: process.env.PROD_DB_PASSWORD,
    port: process.env.PROD_DB_PORT || 5432,
});

/**
 * Récupérer toutes les tables et leurs colonnes d'une base
 */
async function getAllTablesAndColumns(pool) {
    const query = `
        SELECT 
            t.table_name,
            c.column_name,
            c.data_type,
            c.character_maximum_length,
            c.is_nullable,
            c.column_default,
            c.ordinal_position
        FROM information_schema.tables t
        LEFT JOIN information_schema.columns c 
            ON t.table_name = c.table_name 
            AND t.table_schema = c.table_schema
        WHERE t.table_schema = 'public'
            AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name, c.ordinal_position
    `;

    const result = await pool.query(query);

    // Organiser par table
    const tables = {};
    result.rows.forEach(row => {
        if (!tables[row.table_name]) {
            tables[row.table_name] = {
                name: row.table_name,
                columns: []
            };
        }

        if (row.column_name) {
            tables[row.table_name].columns.push({
                name: row.column_name,
                type: row.data_type,
                maxLength: row.character_maximum_length,
                nullable: row.is_nullable === 'YES',
                default: row.column_default,
                position: row.ordinal_position
            });
        }
    });

    return tables;
}

/**
 * Comparer les schémas et générer les différences
 */
function compareSchemas(localTables, prodTables) {
    const differences = {
        missingTables: [],
        extraTables: [],
        tablesDiff: []
    };

    // Tables manquantes en production
    for (const tableName in localTables) {
        if (!prodTables[tableName]) {
            differences.missingTables.push(tableName);
        }
    }

    // Tables en trop en production
    for (const tableName in prodTables) {
        if (!localTables[tableName]) {
            differences.extraTables.push(tableName);
        }
    }

    // Comparer les colonnes pour chaque table commune
    for (const tableName in localTables) {
        if (!prodTables[tableName]) continue;

        const localCols = localTables[tableName].columns;
        const prodCols = prodTables[tableName].columns;

        const localColMap = {};
        const prodColMap = {};

        localCols.forEach(col => localColMap[col.name] = col);
        prodCols.forEach(col => prodColMap[col.name] = col);

        const missingColumns = [];
        const extraColumns = [];
        const differentColumns = [];

        // Colonnes manquantes en production
        for (const colName in localColMap) {
            if (!prodColMap[colName]) {
                missingColumns.push(localColMap[colName]);
            } else {
                // Vérifier si les types diffèrent
                const localCol = localColMap[colName];
                const prodCol = prodColMap[colName];

                if (localCol.type !== prodCol.type ||
                    localCol.nullable !== prodCol.nullable) {
                    differentColumns.push({
                        name: colName,
                        local: localCol,
                        prod: prodCol
                    });
                }
            }
        }

        // Colonnes en trop en production
        for (const colName in prodColMap) {
            if (!localColMap[colName]) {
                extraColumns.push(prodColMap[colName]);
            }
        }

        if (missingColumns.length > 0 || extraColumns.length > 0 || differentColumns.length > 0) {
            differences.tablesDiff.push({
                table: tableName,
                missingColumns,
                extraColumns,
                differentColumns
            });
        }
    }

    return differences;
}

/**
 * Générer les statements SQL de correction
 */
function generateSQLFixes(differences) {
    const sql = [];

    sql.push('-- Script de synchronisation généré automatiquement');
    sql.push(`-- Date: ${new Date().toISOString()}`);
    sql.push('-- VÉRIFIER AVANT D\'EXÉCUTER!\n');
    sql.push('BEGIN;\n');

    // Tables manquantes (WARNING - à créer manuellement)
    if (differences.missingTables.length > 0) {
        sql.push('-- ⚠️ TABLES MANQUANTES EN PRODUCTION:');
        differences.missingTables.forEach(table => {
            sql.push(`-- TODO: créer table ${table} (nécessite migration complète)`);
        });
        sql.push('');
    }

    // Tables en trop (WARNING - à supprimer manuellement?)
    if (differences.extraTables.length > 0) {
        sql.push('-- ⚠️ TABLES EN TROP EN PRODUCTION (absentes du local):');
        differences.extraTables.forEach(table => {
            sql.push(`-- REVIEW: DROP TABLE IF EXISTS ${table} CASCADE; -- À VÉRIFIER!`);
        });
        sql.push('');
    }

    // Différences de colonnes
    differences.tablesDiff.forEach(diff => {
        sql.push(`-- Table: ${diff.table}`);
        sql.push(`-- ────────────────────────────────────────────────────────────────`);

        // Colonnes manquantes à ajouter
        diff.missingColumns.forEach(col => {
            let colDef = `${col.type}`;
            if (col.maxLength) {
                colDef += `(${col.maxLength})`;
            }
            if (!col.nullable) {
                colDef += ' NOT NULL';
            }
            if (col.default) {
                colDef += ` DEFAULT ${col.default}`;
            }

            sql.push(`ALTER TABLE ${diff.table} ADD COLUMN IF NOT EXISTS ${col.name} ${colDef};`);
        });

        // Colonnes en trop à supprimer (commenté par sécurité)
        diff.extraColumns.forEach(col => {
            sql.push(`-- ALTER TABLE ${diff.table} DROP COLUMN IF EXISTS ${col.name}; -- REVIEW NEEDED`);
        });

        // Colonnes différentes
        diff.differentColumns.forEach(col => {
            sql.push(`-- DIFF: ${col.name}`);
            sql.push(`--   Local:  ${col.local.type} ${col.local.nullable ? 'NULL' : 'NOT NULL'}`);
            sql.push(`--   Prod:   ${col.prod.type} ${col.prod.nullable ? 'NULL' : 'NOT NULL'}`);
            sql.push(`-- TODO: ALTER TABLE ${diff.table} ALTER COLUMN ${col.name} ...`);
        });

        sql.push('');
    });

    sql.push('\nCOMMIT;');

    return sql.join('\n');
}

/**
 * Afficher un rapport de comparaison
 */
function printReport(differences, localTables, prodTables) {
    console.log('\n📊 RAPPORT DE COMPARAISON DES SCHÉMAS');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    console.log(`📋 Tables locales:     ${Object.keys(localTables).length}`);
    console.log(`📋 Tables production:  ${Object.keys(prodTables).length}\n`);

    if (differences.missingTables.length > 0) {
        console.log(`❌ Tables manquantes en production: ${differences.missingTables.length}`);
        differences.missingTables.forEach(t => console.log(`   - ${t}`));
        console.log('');
    }

    if (differences.extraTables.length > 0) {
        console.log(`⚠️  Tables en trop en production: ${differences.extraTables.length}`);
        differences.extraTables.forEach(t => console.log(`   - ${t}`));
        console.log('');
    }

    if (differences.tablesDiff.length > 0) {
        console.log(`🔍 Tables avec différences: ${differences.tablesDiff.length}\n`);

        differences.tablesDiff.forEach(diff => {
            console.log(`\n📋 Table: ${diff.table}`);
            console.log(`   ├─ Colonnes manquantes: ${diff.missingColumns.length}`);
            diff.missingColumns.forEach(col => {
                console.log(`   │  └─ ${col.name} (${col.type})`);
            });

            if (diff.extraColumns.length > 0) {
                console.log(`   ├─ Colonnes en trop: ${diff.extraColumns.length}`);
                diff.extraColumns.forEach(col => {
                    console.log(`   │  └─ ${col.name} (${col.type})`);
                });
            }

            if (diff.differentColumns.length > 0) {
                console.log(`   └─ Colonnes différentes: ${diff.differentColumns.length}`);
                diff.differentColumns.forEach(col => {
                    console.log(`      └─ ${col.name}`);
                });
            }
        });
    } else {
        console.log('✅ Aucune différence de colonnes détectée!');
    }

    console.log('\n═══════════════════════════════════════════════════════════════════');
}

/**
 * Script principal
 */
async function main() {
    console.log('\n🔍 COMPARAISON COMPLÈTE DES SCHÉMAS LOCAL ↔ PRODUCTION');
    console.log('════════════════════════════════════════════════════════════════════\n');

    try {
        // Récupérer les schémas
        console.log('📥 Récupération du schéma local...');
        const localTables = await getAllTablesAndColumns(localPool);
        console.log(`   ✅ ${Object.keys(localTables).length} tables trouvées\n`);

        console.log('📥 Récupération du schéma production...');
        const prodTables = await getAllTablesAndColumns(productionPool);
        console.log(`   ✅ ${Object.keys(prodTables).length} tables trouvées\n`);

        // Comparer
        console.log('🔄 Comparaison en cours...\n');
        const differences = compareSchemas(localTables, prodTables);

        // Afficher le rapport
        printReport(differences, localTables, prodTables);

        // Générer le SQL
        const sqlFixes = generateSQLFixes(differences);
        const outputPath = path.join(__dirname, 'schema-sync-fixes.sql');
        require('fs').writeFileSync(outputPath, sqlFixes);

        console.log(`\n💾 Script SQL généré: ${outputPath}`);
        console.log('\n⚠️  ATTENTION: Vérifiez le script avant de l\'exécuter!');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        throw error;
    } finally {
        await localPool.end();
        await productionPool.end();
    }
}

// Exécuter
main().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
});
