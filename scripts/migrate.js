#!/usr/bin/env node
/**
 * Migration Runner
 * Exécute toutes les migrations SQL dans l'ordre
 * Maintient une table de tracking pour éviter les migrations en double
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/utils/database');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const MIGRATIONS_TABLE = 'schema_migrations';

// Couleurs pour la console
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    gray: '\x1b[90m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Crée la table de tracking des migrations si elle n'existe pas
 */
async function ensureMigrationsTable() {
    const query = `
        CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255) NOT NULL UNIQUE,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            checksum VARCHAR(64)
        );
        CREATE INDEX IF NOT EXISTS idx_migrations_filename ON ${MIGRATIONS_TABLE}(filename);
    `;

    try {
        await pool.query(query);
        log('✅ Table de tracking des migrations prête', 'green');
    } catch (error) {
        log(`❌ Erreur lors de la création de la table de tracking: ${error.message}`, 'red');
        throw error;
    }
}

/**
 * Récupère la liste des migrations déjà exécutées
 */
async function getExecutedMigrations() {
    const result = await pool.query(
        `SELECT filename FROM ${MIGRATIONS_TABLE} ORDER BY executed_at`
    );
    return new Set(result.rows.map(row => row.filename));
}

/**
 * Calcule un checksum simple pour détecter les modifications
 */
function calculateChecksum(content) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Récupère toutes les migrations à exécuter
 */
function getPendingMigrations(executedMigrations) {
    if (!fs.existsSync(MIGRATIONS_DIR)) {
        log(`⚠️  Dossier de migrations introuvable: ${MIGRATIONS_DIR}`, 'yellow');
        return [];
    }

    const files = fs.readdirSync(MIGRATIONS_DIR)
        .filter(file => file.endsWith('.sql'))
        .sort(); // Tri alphabétique (important pour l'ordre d'exécution)

    return files.filter(file => !executedMigrations.has(file));
}

/**
 * Exécute une migration SQL
 */
async function executeMigration(filename) {
    const filepath = path.join(MIGRATIONS_DIR, filename);
    const content = fs.readFileSync(filepath, 'utf8');
    const checksum = calculateChecksum(content);

    log(`\n📄 Exécution: ${filename}`, 'blue');

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Exécuter le SQL de la migration
        await client.query(content);

        // Enregistrer la migration comme exécutée
        await client.query(
            `INSERT INTO ${MIGRATIONS_TABLE} (filename, checksum) VALUES ($1, $2)`,
            [filename, checksum]
        );

        await client.query('COMMIT');
        log(`✅ Migration exécutée avec succès: ${filename}`, 'green');

    } catch (error) {
        await client.query('ROLLBACK');
        log(`❌ Erreur lors de l'exécution de ${filename}:`, 'red');
        log(`   ${error.message}`, 'red');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Fonction principale
 */
async function runMigrations(closePool = true) {
    log('\n🚀 Démarrage du système de migrations', 'blue');
    log('━'.repeat(60), 'gray');

    try {
        // ... (execution logic remains same via existing code, we are just changing the wrapper)
        // 1. Créer la table de tracking
        await ensureMigrationsTable();

        // 2. Récupérer les migrations déjà exécutées
        const executedMigrations = await getExecutedMigrations();
        log(`📊 Migrations déjà exécutées: ${executedMigrations.size}`, 'gray');

        // 3. Récupérer les migrations en attente
        const pendingMigrations = getPendingMigrations(executedMigrations);

        if (pendingMigrations.length === 0) {
            log('\n✨ Aucune nouvelle migration à exécuter', 'green');
            log('━'.repeat(60), 'gray');
            return;
        }

        log(`\n📦 Migrations à exécuter: ${pendingMigrations.length}`, 'yellow');
        pendingMigrations.forEach((file, index) => {
            log(`   ${index + 1}. ${file}`, 'gray');
        });

        // 4. Exécuter chaque migration
        for (const migration of pendingMigrations) {
            await executeMigration(migration);
        }

        log('\n━'.repeat(60), 'gray');
        log(`✅ Toutes les migrations ont été exécutées avec succès (${pendingMigrations.length})`, 'green');
        log('━'.repeat(60), 'gray');

    } catch (error) {
        log('\n━'.repeat(60), 'gray');
        log('❌ Échec de l\'exécution des migrations', 'red');
        log('━'.repeat(60), 'gray');
        if (closePool) process.exit(1);
        else throw error; // Re-throw for server to handle
    } finally {
        if (closePool) {
            await pool.end();
        }
    }
}

// Exécution
if (require.main === module) {
    runMigrations().catch(error => {
        console.error(error);
        process.exit(1);
    });
}

module.exports = { runMigrations };
