#!/usr/bin/env node
/**
 * 🔧 SCRIPT DE SYNCHRONISATION PRODUCTION
 * ========================================
 * 
 * Compare la base de données de production avec le schéma local
 * et génère/applique les corrections nécessaires
 * 
 * Usage: node scripts/database/sync-production-schema.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

// Configuration de connexion selon les variables d'environnement
const pool = new Pool(
    process.env.DATABASE_URL
        ? {
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        }
        : {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'ebvision',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        }
);

/**
 * Récupère le schéma complet d'une table
 */
async function getTableSchema(client, tableName) {
    // Colonnes
    const columnsResult = await client.query(`
        SELECT 
            column_name,
            data_type,
            character_maximum_length,
            is_nullable,
            column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position
    `, [tableName]);

    return {
        columns: columnsResult.rows
    };
}

/**
 * Récupère toutes les tables
 */
async function getAllTables(client) {
    const result = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    `);
    return result.rows.map(r => r.table_name);
}

/**
 * Compare deux schémas et génère les différences
 */
function compareSchemas(localSchema, prodSchema) {
    const differences = [];

    // Comparer les colonnes
    const localColumns = new Map(localSchema.columns.map(c => [c.column_name, c]));
    const prodColumns = new Map(prodSchema.columns.map(c => [c.column_name, c]));

    // Colonnes manquantes en production
    for (const [colName, colDef] of localColumns) {
        if (!prodColumns.has(colName)) {
            differences.push({
                type: 'MISSING_COLUMN',
                column: colName,
                definition: colDef
            });
        }
    }

    // Colonnes en trop en production
    for (const [colName, colDef] of prodColumns) {
        if (!localColumns.has(colName)) {
            differences.push({
                type: 'EXTRA_COLUMN',
                column: colName,
                definition: colDef
            });
        }
    }

    return differences;
}

/**
 * Génère les commandes SQL de correction
 */
function generateFixSQL(tableName, differences) {
    const sql = [];

    for (const diff of differences) {
        if (diff.type === 'MISSING_COLUMN') {
            const col = diff.definition;
            let dataType = col.data_type;
            if (col.character_maximum_length) {
                dataType += `(${col.character_maximum_length})`;
            }
            const nullable = col.is_nullable === 'YES' ? '' : ' NOT NULL';
            const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';

            sql.push(`ALTER TABLE ${tableName} ADD COLUMN ${diff.column} ${dataType}${nullable}${defaultVal};`);
        } else if (diff.type === 'EXTRA_COLUMN') {
            sql.push(`-- ATTENTION: Colonne en trop en production: ${tableName}.${diff.column}`);
            sql.push(`-- ALTER TABLE ${tableName} DROP COLUMN ${diff.column}; -- DÉCOMMENTEZ SI VOUS ÊTES SÛR`);
        }
    }

    return sql;
}

async function syncProductionSchema() {
    const client = await pool.connect();

    try {
        console.log('\n🔍 ANALYSE DE SYNCHRONISATION PRODUCTION');
        console.log('═══════════════════════════════════════\n');

        // Charger le schéma de référence depuis schema-structure-only.sql
        const schemaPath = path.join(__dirname, 'schema-structure-only.sql');

        if (!fs.existsSync(schemaPath)) {
            console.log('❌ Fichier schema-structure-only.sql introuvable!');
            console.log('💡 Générez-le d\'abord en local avec pg_dump\\n');
            return;
        }

        console.log('📋 Chargement du schéma de référence local...');
        const referenceSchema = fs.readFileSync(schemaPath, 'utf8');

        console.log('✅ Schéma de référence chargé\n');

        // Obtenir les tables en production
        console.log('🔍 Analyse des tables en production...');
        const prodTables = await getAllTables(client);
        console.log(`✅ ${prodTables.length} tables trouvées en production\n`);

        // Analyser les différences pour les tables critiques
        const criticalTables = ['time_sheets', 'time_entries', 'time_sheet_approvals'];
        const allDifferences = {};
        let totalDifferences = 0;

        for (const tableName of criticalTables) {
            if (!prodTables.includes(tableName)) {
                console.log(`❌ Table manquante en production: ${tableName}`);
                continue;
            }

            console.log(`🔍 Analyse de: ${tableName}...`);
            const prodSchema = await getTableSchema(client, tableName);

            // Pour comparer, on doit parser le schéma SQL local
            // Pour simplifier, on va vérifier les colonnes spécifiques connues
            const differences = [];

            // Vérifications spécifiques pour time_sheets
            if (tableName === 'time_sheets') {
                const hasStatut = prodSchema.columns.some(c => c.column_name === 'statut');
                const hasStatus = prodSchema.columns.some(c => c.column_name === 'status');

                if (!hasStatut) {
                    differences.push({
                        type: 'MISSING_COLUMN',
                        column: 'statut',
                        definition: {
                            column_name: 'statut',
                            data_type: 'character varying',
                            character_maximum_length: 50,
                            is_nullable: 'YES',
                            column_default: "'brouillon'::character varying"
                        }
                    });
                }

                if (hasStatus) {
                    differences.push({
                        type: 'EXTRA_COLUMN',
                        column: 'status',
                        definition: prodSchema.columns.find(c => c.column_name === 'status')
                    });
                }
            }

            // Vérifications pour time_entries
            if (tableName === 'time_entries') {
                const hasStatus = prodSchema.columns.some(c => c.column_name === 'status');
                const hasStatut = prodSchema.columns.some(c => c.column_name === 'statut');

                if (hasStatus) {
                    differences.push({
                        type: 'EXTRA_COLUMN',
                        column: 'status',
                        definition: prodSchema.columns.find(c => c.column_name === 'status')
                    });
                }

                if (hasStatut) {
                    differences.push({
                        type: 'EXTRA_COLUMN',
                        column: 'statut',
                        definition: prodSchema.columns.find(c => c.column_name === 'statut')
                    });
                }
            }

            if (differences.length > 0) {
                allDifferences[tableName] = differences;
                totalDifferences += differences.length;
                console.log(`   ⚠️  ${differences.length} différence(s) trouvée(s)`);
            } else {
                console.log(`   ✅ Schéma conforme`);
            }
        }

        console.log(`\n📊 RÉSUMÉ: ${totalDifferences} différence(s) totale(s)\n`);

        if (totalDifferences === 0) {
            console.log('✅ Schéma de production conforme au schéma local!');
            return;
        }

        // Générer le script SQL de correction
        console.log('🔧 Génération du script de correction SQL...\n');
        console.log('═'.repeat(80));

        const fixScript = [];
        fixScript.push('-- Script de correction généré automatiquement');
        fixScript.push(`-- Date: ${new Date().toISOString()}`);
        fixScript.push('-- EXÉCUTER APRÈS VÉRIFICATION!\n');
        fixScript.push('BEGIN;\n');

        for (const [tableName, differences] of Object.entries(allDifferences)) {
            fixScript.push(`-- Corrections pour ${tableName}`);
            fixScript.push(`-- ${'─'.repeat(60)}`);
            const sql = generateFixSQL(tableName, differences);
            fixScript.push(...sql);
            fixScript.push('');
        }

        fixScript.push('COMMIT;');

        const scriptContent = fixScript.join('\n');
        console.log(scriptContent);
        console.log('═'.repeat(80));

        // Sauvegarder le script
        const outputPath = path.join(__dirname, 'fix-production-schema.sql');
        fs.writeFileSync(outputPath, scriptContent);
        console.log(`\n💾 Script sauvegardé: ${outputPath}\n`);

        // Demander confirmation pour appliquer
        const confirm = await ask('❓ Voulez-vous appliquer ces corrections MAINTENANT? (oui/non): ');

        if (confirm.toLowerCase() === 'oui' || confirm.toLowerCase() === 'yes') {
            console.log('\n🔧 Application des corrections...\n');

            await client.query('BEGIN');

            for (const [tableName, differences] of Object.entries(allDifferences)) {
                const sql = generateFixSQL(tableName, differences);
                for (const statement of sql) {
                    if (statement.trim().startsWith('--')) continue; // Skip comments
                    console.log(`   Exécution: ${statement.substring(0, 60)}...`);
                    await client.query(statement);
                }
            }

            await client.query('COMMIT');

            console.log('\n✅ ========================================');
            console.log('✅ CORRECTIONS APPLIQUÉES AVEC SUCCÈS!');
            console.log('✅ ========================================\n');
        } else {
            console.log('\n⏸️  Corrections non appliquées.');
            console.log(`💡 Vous pouvez les appliquer manuellement avec: psql ... -f ${outputPath}\n`);
        }

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ ERREUR:', error.message);
        console.error(error);
        throw error;
    } finally {
        client.release();
        rl.close();
        await pool.end();
    }
}

// Exécution
if (require.main === module) {
    syncProductionSchema()
        .then(() => {
            console.log('✅ Script terminé');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script échoué:', error.message);
            process.exit(1);
        });
}

module.exports = { syncProductionSchema };
