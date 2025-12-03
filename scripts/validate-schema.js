#!/usr/bin/env node
/**
 * Schema Validator
 * Vérifie que le schéma de la base de données est conforme
 * Compare avec le schéma attendu (extrait des migrations)
 */

require('dotenv').config();
const { pool } = require('../src/utils/database');

// Couleurs pour la console
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    gray: '\x1b[90m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Récupère toutes les tables de la base de données
 */
async function getDatabaseTables() {
    const query = `
        SELECT 
            table_name,
            table_schema
        FROM information_schema.tables
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY table_schema, table_name;
    `;

    const result = await pool.query(query);
    return result.rows;
}

/**
 * Récupère les colonnes d'une table
 */
async function getTableColumns(tableName, schema = 'public') {
    const query = `
        SELECT 
            column_name,
            data_type,
            character_maximum_length,
            is_nullable,
            column_default
        FROM information_schema.columns
        WHERE table_schema = $1 
        AND table_name = $2
        ORDER BY ordinal_position;
    `;

    const result = await pool.query(query, [schema, tableName]);
    return result.rows;
}

/**
 * Récupère les contraintes d'une table
 */
async function getTableConstraints(tableName, schema = 'public') {
    const query = `
        SELECT 
            constraint_name,
            constraint_type
        FROM information_schema.table_constraints
        WHERE table_schema = $1 
        AND table_name = $2;
    `;

    const result = await pool.query(query, [schema, tableName]);
    return result.rows;
}

/**
 * Récupère les index d'une table
 */
async function getTableIndexes(tableName, schema = 'public') {
    const query = `
        SELECT
            indexname,
            indexdef
        FROM pg_indexes
        WHERE schemaname = $1
        AND tablename = $2;
    `;

    const result = await pool.query(query, [schema, tableName]);
    return result.rows;
}

/**
 * Récupère les foreign keys d'une table
 */
async function getTableForeignKeys(tableName, schema = 'public') {
    const query = `
        SELECT
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = $1
          AND tc.table_name = $2;
    `;

    const result = await pool.query(query, [schema, tableName]);
    return result.rows;
}

/**
 * Affiche un rapport détaillé du schéma de la base
 */
async function generateSchemaReport() {
    log('\n🔍 Analyse du schéma de la base de données', 'blue');
    log('━'.repeat(80), 'gray');

    try {
        const tables = await getDatabaseTables();

        if (tables.length === 0) {
            log('⚠️  Aucune table trouvée dans la base de données', 'yellow');
            return;
        }

        log(`\n📊 Nombre total de tables: ${tables.length}`, 'cyan');

        for (const table of tables) {
            const { table_name, table_schema } = table;

            log(`\n${'─'.repeat(80)}`, 'gray');
            log(`📋 Table: ${table_schema}.${table_name}`, 'cyan');
            log(`${'─'.repeat(80)}`, 'gray');

            // Colonnes
            const columns = await getTableColumns(table_name, table_schema);
            log(`\n  📌 Colonnes (${columns.length}):`, 'yellow');
            columns.forEach(col => {
                const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)';
                const typeInfo = col.character_maximum_length
                    ? `${col.data_type}(${col.character_maximum_length})`
                    : col.data_type;
                const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
                log(`     • ${col.column_name}: ${typeInfo} ${nullable}${defaultVal}`, 'gray');
            });

            // Contraintes
            const constraints = await getTableConstraints(table_name, table_schema);
            if (constraints.length > 0) {
                log(`\n  🔒 Contraintes (${constraints.length}):`, 'yellow');
                constraints.forEach(c => {
                    log(`     • ${c.constraint_name} (${c.constraint_type})`, 'gray');
                });
            }

            // Index
            const indexes = await getTableIndexes(table_name, table_schema);
            if (indexes.length > 0) {
                log(`\n  🔑 Index (${indexes.length}):`, 'yellow');
                indexes.forEach(idx => {
                    log(`     • ${idx.indexname}`, 'gray');
                });
            }

            // Foreign Keys
            const fks = await getTableForeignKeys(table_name, table_schema);
            if (fks.length > 0) {
                log(`\n  🔗 Clés étrangères (${fks.length}):`, 'yellow');
                fks.forEach(fk => {
                    log(`     • ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`, 'gray');
                });
            }
        }

        log(`\n${'━'.repeat(80)}`, 'gray');
        log('✅ Analyse du schéma terminée', 'green');
        log('━'.repeat(80), 'gray');

        // Vérifications de base
        log('\n🔍 Vérifications de conformité:', 'blue');
        log('━'.repeat(80), 'gray');

        // Vérifier que la table de migrations existe
        const hasMigrationsTable = tables.some(t => t.table_name === 'schema_migrations');
        if (hasMigrationsTable) {
            log('✅ Table schema_migrations présente', 'green');

            // Afficher les migrations exécutées
            const migrations = await pool.query('SELECT filename, executed_at FROM schema_migrations ORDER BY executed_at');
            log(`\n📦 Migrations exécutées: ${migrations.rows.length}`, 'cyan');
            migrations.rows.forEach((m, i) => {
                const date = new Date(m.executed_at).toISOString().split('T')[0];
                log(`   ${i + 1}. ${m.filename} (${date})`, 'gray');
            });
        } else {
            log('⚠️  Table schema_migrations absente (exécutez npm run migrate)', 'yellow');
        }

        log('\n━'.repeat(80), 'gray');

    } catch (error) {
        log(`❌ Erreur lors de l'analyse du schéma: ${error.message}`, 'red');
        throw error;
    }
}

/**
 * Fonction principale
 */
async function validateSchema() {
    try {
        await generateSchemaReport();
    } catch (error) {
        console.error(error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Exécution
if (require.main === module) {
    validateSchema();
}

module.exports = { validateSchema };
