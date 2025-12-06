#!/usr/bin/env node
/**
 * 🚀 APPLICATEUR DE SCHÉMA
 * ========================
 * 
 * Applique le fichier schema-structure-only.sql à la BD configurée dans .env
 * Utilise IF NOT EXISTS pour être idempotent et sûr
 * 
 * Usage: node scripts/database/apply-schema.js
 * 
 * Ce script doit être exécuté en PRODUCTION après avoir pull le schéma depuis git
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Configuration de connexion
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
 * Parse le fichier SQL pour extraire les CREATE TABLE
 */
function parseSchema(sqlContent) {
    const statements = {
        tables: [],
        indexes: [],
        constraints: [],
        sequences: [],
        other: []
    };

    // Split en statements individuels (séparés par ;)
    const allStatements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    for (const statement of allStatements) {
        const normalizedStmt = statement.replace(/\s+/g, ' ').trim();

        if (normalizedStmt.match(/^CREATE TABLE/i)) {
            statements.tables.push(statement + ';');
        } else if (normalizedStmt.match(/^CREATE.*INDEX/i)) {
            statements.indexes.push(statement + ';');
        } else if (normalizedStmt.match(/^ALTER TABLE.*ADD CONSTRAINT/i)) {
            statements.constraints.push(statement + ';');
        } else if (normalizedStmt.match(/^CREATE SEQUENCE/i)) {
            statements.sequences.push(statement + ';');
        } else if (normalizedStmt.match(/^CREATE/i) || normalizedStmt.match(/^ALTER/i)) {
            statements.other.push(statement + ';');
        }
    }

    return statements;
}

/**
 * Convertit CREATE TABLE en version IF NOT EXISTS
 */
function makeTableIdempotent(createTableSQL) {
    // Remplacer "CREATE TABLE" par "CREATE TABLE IF NOT EXISTS"
    return createTableSQL.replace(/CREATE TABLE\s+/i, 'CREATE TABLE IF NOT EXISTS ');
}

/**
 * Convertit CREATE INDEX en version IF NOT EXISTS
 */
function makeIndexIdempotent(createIndexSQL) {
    return createIndexSQL.replace(/CREATE\s+(UNIQUE\s+)?INDEX\s+/i, 'CREATE $1INDEX IF NOT EXISTS ');
}

/**
 * Convertit ALTER TABLE ADD CONSTRAINT en version safe
 */
function makeConstraintIdempotent(client, alterTableSQL) {
    // Extraire le nom de la contrainte
    const match = alterTableSQL.match(/ADD CONSTRAINT\s+(\w+)/i);
    if (!match) return alterTableSQL;

    const constraintName = match[1];
    const tableName = alterTableSQL.match(/ALTER TABLE\s+(\w+)/i)?.[1];

    if (!tableName) return alterTableSQL;

    // Retourner un statement conditionnel
    return `
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = '${constraintName}' 
        AND table_name = '${tableName}'
    ) THEN
        ${alterTableSQL}
    END IF;
END $$;`;
}

async function applySchema() {
    const client = await pool.connect();

    try {
        log('\n🚀 APPLICATION DU SCHÉMA DE BASE DE DONNÉES', 'blue');
        log('═'.repeat(60), 'cyan');

        // Lire la configuration
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'ebvision',
            user: process.env.DB_USER || 'postgres'
        };

        log('\n📋 Configuration détectée:', 'cyan');
        log(`   🗄️  Base de données: ${dbConfig.database}`, 'reset');
        log(`   🖥️  Hôte: ${dbConfig.host}:${dbConfig.port}`, 'reset');
        log(`   👤 Utilisateur: ${dbConfig.user}`, 'reset');

        // Vérifier que le fichier de schéma existe
        const schemaPath = path.join(__dirname, 'schema-structure-only.sql');

        if (!fs.existsSync(schemaPath)) {
            log('\n❌ Fichier schema-structure-only.sql introuvable!', 'red');
            log('💡 Exécutez d\'abord en local:', 'yellow');
            log('   node scripts/database/generate-schema.js', 'reset');
            log('   git add scripts/database/schema-structure-only.sql', 'reset');
            log('   git commit && git push', 'reset');
            log('\nPuis en production:', 'yellow');
            log('   git pull origin main', 'reset');
            log('   node scripts/database/apply-schema.js', 'reset');
            log('');
            return;
        }

        log('\n📄 Chargement du schéma...', 'yellow');
        const schemaContent = fs.readFileSync(schemaPath, 'utf8');

        const fileSize = fs.statSync(schemaPath).size;
        const fileSizeKB = (fileSize / 1024).toFixed(2);
        log(`   ✅ Schéma chargé (${fileSizeKB} KB)`, 'reset');

        // Parser le schéma
        log('\n🔍 Analyse du schéma...', 'yellow');
        const statements = parseSchema(schemaContent);

        log(`   📋 Tables: ${statements.tables.length}`, 'reset');
        log(`   🔑 Index: ${statements.indexes.length}`, 'reset');
        log(`   🔒 Contraintes: ${statements.constraints.length}`, 'reset');
        log(`   📦 Séquences: ${statements.sequences.length}`, 'reset');
        log(`   ➕ Autres: ${statements.other.length}`, 'reset');

        const totalStatements =
            statements.tables.length +
            statements.indexes.length +
            statements.constraints.length +
            statements.sequences.length +
            statements.other.length;

        log(`\n⚠️  ${totalStatements} déclarations à appliquer`, 'yellow');

        // Demander confirmation
        const confirm = await ask('\n❓ Voulez-vous appliquer ce schéma? (oui/non): ');

        if (confirm.toLowerCase() !== 'oui' && confirm.toLowerCase() !== 'yes') {
            log('\n⏸️  Opération annulée', 'yellow');
            return;
        }

        log('\n🔧 Application du schéma en cours...', 'blue');
        log('═'.repeat(60), 'cyan');

        let succeeded = 0;
        let skipped = 0;
        let failed = 0;

        await client.query('BEGIN');

        // Appliquer les séquences en premier
        log('\n📦 Application des séquences...', 'cyan');
        for (const stmt of statements.sequences) {
            try {
                await client.query(stmt);
                succeeded++;
                process.stdout.write('.');
            } catch (error) {
                if (error.message.includes('already exists')) {
                    skipped++;
                    process.stdout.write('s');
                } else {
                    failed++;
                    process.stdout.write('!');
                    log(`\n   ⚠️  Erreur: ${error.message.split('\n')[0]}`, 'yellow');
                }
            }
        }

        // Appliquer les tables
        log('\n\n📋 Application des tables...', 'cyan');
        for (const stmt of statements.tables) {
            try {
                const idempotentStmt = makeTableIdempotent(stmt);
                await client.query(idempotentStmt);
                succeeded++;
                process.stdout.write('.');
            } catch (error) {
                if (error.message.includes('already exists')) {
                    skipped++;
                    process.stdout.write('s');
                } else {
                    failed++;
                    process.stdout.write('!');
                    log(`\n   ⚠️  Erreur: ${error.message.split('\n')[0]}`, 'yellow');
                }
            }
        }

        // Appliquer les index
        log('\n\n🔑 Application des index...', 'cyan');
        for (const stmt of statements.indexes) {
            try {
                const idempotentStmt = makeIndexIdempotent(stmt);
                await client.query(idempotentStmt);
                succeeded++;
                process.stdout.write('.');
            } catch (error) {
                if (error.message.includes('already exists')) {
                    skipped++;
                    process.stdout.write('s');
                } else {
                    failed++;
                    process.stdout.write('!');
                }
            }
        }

        // Appliquer les contraintes
        log('\n\n🔒 Application des contraintes...', 'cyan');
        for (const stmt of statements.constraints) {
            try {
                const idempotentStmt = makeConstraintIdempotent(client, stmt);
                await client.query(idempotentStmt);
                succeeded++;
                process.stdout.write('.');
            } catch (error) {
                if (error.message.includes('already exists')) {
                    skipped++;
                    process.stdout.write('s');
                } else {
                    failed++;
                    process.stdout.write('!');
                }
            }
        }

        // Appliquer les autres statements
        if (statements.other.length > 0) {
            log('\n\n➕ Application des autres éléments...', 'cyan');
            for (const stmt of statements.other) {
                try {
                    await client.query(stmt);
                    succeeded++;
                    process.stdout.write('.');
                } catch (error) {
                    if (error.message.includes('already exists')) {
                        skipped++;
                        process.stdout.write('s');
                    } else {
                        failed++;
                        process.stdout.write('!');
                    }
                }
            }
        }

        await client.query('COMMIT');

        log('\n\n✅ SCHÉMA APPLIQUÉ AVEC SUCCÈS!', 'green');
        log('═'.repeat(60), 'cyan');
        log('\n📊 Résumé:', 'cyan');
        log(`   ✅ Créés/Mis à jour: ${succeeded}`, 'green');
        log(`   ⏭️  Déjà existants: ${skipped}`, 'gray');
        if (failed > 0) {
            log(`   ❌ Échecs: ${failed}`, 'red');
        }
        log(`   📊 Total: ${totalStatements}`, 'reset');

        log('\n🎯 PROCHAINES ÉTAPES:', 'blue');
        log('═'.repeat(60), 'cyan');
        log('   1. Redémarrer l\'application:', 'yellow');
        log('      pm2 restart ebvision', 'reset');
        log('\n   2. Vérifier les logs:', 'yellow');
        log('      pm2 logs ebvision', 'reset');
        log('\n   3. Tester les fonctionnalités:', 'yellow');
        log('      - Saisie de temps', 'reset');
        log('      - Soumission', 'reset');
        log('      - Approbation', 'reset');
        log('');

    } catch (error) {
        await client.query('ROLLBACK');
        log('\n❌ ERREUR lors de l\'application du schéma', 'red');
        log('═'.repeat(60), 'cyan');
        log(`\nDétails: ${error.message}`, 'reset');
        log('');
        process.exit(1);
    } finally {
        client.release();
        rl.close();
        await pool.end();
    }
}

// Exécution
if (require.main === module) {
    applySchema()
        .then(() => {
            log('✅ Script terminé\n', 'green');
            process.exit(0);
        })
        .catch((error) => {
            log(`\n❌ Erreur fatale: ${error.message}`, 'red');
            process.exit(1);
        });
}

module.exports = { applySchema };
