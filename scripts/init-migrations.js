#!/usr/bin/env node
/**
 * Initialize Migration Tracking
 * Marque toutes les migrations existantes comme déjà exécutées
 * Utiliser UNIQUEMENT lors de la première initialisation du système de migrations
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/utils/database');
const crypto = require('crypto');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const MIGRATIONS_TABLE = 'schema_migrations';

// Couleurs
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

function calculateChecksum(content) {
    return crypto.createHash('md5').update(content).digest('hex');
}

async function initializeMigrationTracking() {
    log('\n🔧 Initialisation du système de tracking des migrations', 'blue');
    log('━'.repeat(80), 'gray');

    try {
        // 1. Créer la table de tracking
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                checksum VARCHAR(64)
            );
            CREATE INDEX IF NOT EXISTS idx_migrations_filename ON ${MIGRATIONS_TABLE}(filename);
        `;

        await pool.query(createTableQuery);
        log('✅ Table schema_migrations créée', 'green');

        // 2. Récupérer toutes les migrations existantes
        if (!fs.existsSync(MIGRATIONS_DIR)) {
            log(`❌ Dossier de migrations introuvable: ${MIGRATIONS_DIR}`, 'red');
            return;
        }

        const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
            .filter(file => file.endsWith('.sql'))
            .sort();

        if (migrationFiles.length === 0) {
            log('⚠️  Aucune migration trouvée', 'yellow');
            return;
        }

        log(`\n📦 ${migrationFiles.length} migrations trouvées`, 'cyan');

        // 3. Vérifier quelles migrations sont déjà enregistrées
        const existingMigrations = await pool.query(
            `SELECT filename FROM ${MIGRATIONS_TABLE}`
        );
        const existingSet = new Set(existingMigrations.rows.map(r => r.filename));

        // 4. Marquer toutes les migrations comme exécutées
        let marked = 0;
        let skipped = 0;

        for (const filename of migrationFiles) {
            if (existingSet.has(filename)) {
                log(`   ⏭️  Déjà enregistrée: ${filename}`, 'gray');
                skipped++;
                continue;
            }

            const filepath = path.join(MIGRATIONS_DIR, filename);
            const content = fs.readFileSync(filepath, 'utf8');
            const checksum = calculateChecksum(content);

            await pool.query(
                `INSERT INTO ${MIGRATIONS_TABLE} (filename, checksum) VALUES ($1, $2)`,
                [filename, checksum]
            );

            log(`   ✅ Marquée: ${filename}`, 'green');
            marked++;
        }

        log('\n━'.repeat(80), 'gray');
        log(`✅ Initialisation terminée:`, 'green');
        log(`   • ${marked} migration(s) marquée(s) comme exécutée(s)`, 'gray');
        log(`   • ${skipped} migration(s) déjà enregistrée(s)`, 'gray');
        log('━'.repeat(80), 'gray');

        log('\n💡 Prochaines étapes:', 'blue');
        log('   1. Les futures migrations seront détectées automatiquement', 'gray');
        log('   2. Utilisez "npm run migrate" pour exécuter les nouvelles migrations', 'gray');
        log('   3. Utilisez "npm run validate-schema" pour vérifier le schéma', 'gray');

    } catch (error) {
        log(`\n❌ Erreur: ${error.message}`, 'red');
        throw error;
    } finally {
        await pool.end();
    }
}

// Exécution
if (require.main === module) {
    initializeMigrationTracking().catch(error => {
        console.error(error);
        process.exit(1);
    });
}

module.exports = { initializeMigrationTracking };
