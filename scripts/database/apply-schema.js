#!/usr/bin/env node
/**
 * 🚀 APPLICATEUR DE SCHÉMA
 * ========================
 * 
 * Applique le fichier schema-structure-only.sql à la BD configurée dans .env
 * Utilise psql pour une application robuste du schéma complet
 * 
 * Usage: node scripts/database/apply-schema.js
 * 
 * Ce script doit être exécuté en PRODUCTION après avoir pull le schéma depuis git
 */

require('dotenv').config();
const { Pool } = require('pg');
const { execSync } = require('child_process');
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
    gray: '\x1b[90m',
    magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Configuration de connexion
const dbConfig = process.env.DATABASE_URL
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
    };

const pool = new Pool(dbConfig);

/**
 * Obtenir les statistiques de la base de données
 */
async function getDatabaseStats(client) {
    const stats = {};

    // Compter les tables
    const tablesResult = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    stats.tables = parseInt(tablesResult.rows[0].count);

    // Compter les index
    const indexesResult = await client.query(`
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE schemaname = 'public'
    `);
    stats.indexes = parseInt(indexesResult.rows[0].count);

    // Compter les contraintes
    const constraintsResult = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
    `);
    stats.constraints = parseInt(constraintsResult.rows[0].count);

    // Compter les séquences
    const sequencesResult = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
    `);
    stats.sequences = parseInt(sequencesResult.rows[0].count);

    // Compter les fonctions
    const functionsResult = await client.query(`
        SELECT COUNT(*) as count
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
    `);
    stats.functions = parseInt(functionsResult.rows[0].count);

    // Compter les triggers
    const triggersResult = await client.query(`
        SELECT COUNT(*) as count
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public' AND NOT t.tgisinternal
    `);
    stats.triggers = parseInt(triggersResult.rows[0].count);

    return stats;
}

/**
 * Analyser le contenu du fichier de schéma
 */
function analyzeSchemaFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');

    const analysis = {
        fileSize: fs.statSync(filePath).size,
        lines: content.split('\n').length,
        tables: (content.match(/CREATE TABLE/g) || []).length,
        indexes: (content.match(/CREATE.*INDEX/g) || []).length,
        sequences: (content.match(/CREATE SEQUENCE/g) || []).length,
        functions: (content.match(/CREATE.*FUNCTION/g) || []).length,
        triggers: (content.match(/CREATE.*TRIGGER/g) || []).length,
        constraints: (content.match(/ADD CONSTRAINT/g) || []).length
    };

    return analysis;
}

async function applySchema() {
    const client = await pool.connect();

    try {
        log('\n🚀 APPLICATION DU SCHÉMA DE BASE DE DONNÉES', 'blue');
        log('═'.repeat(80), 'cyan');

        // Afficher la configuration
        const config = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'ebvision',
            user: process.env.DB_USER || 'postgres'
        };

        log('\n📋 Configuration détectée:', 'cyan');
        log(`   🗄  Base de données: ${config.database}`, 'reset');
        log(`   🖥️  Hôte: ${config.host}:${config.port}`, 'reset');
        log(`   👤 Utilisateur: ${config.user}`, 'reset');

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

        // Analyser l'état AVANT
        log('\n🔍 ANALYSE DE LA BASE DE DONNÉES ACTUELLE', 'blue');
        log('─'.repeat(80), 'gray');

        const statsBefore = await getDatabaseStats(client);

        log('\n📊 État actuel (AVANT):', 'cyan');
        log(`   📋 Tables: ${statsBefore.tables}`, 'reset');
        log(`   🔑 Index: ${statsBefore.indexes}`, 'reset');
        log(`   🔒 Contraintes: ${statsBefore.constraints}`, 'reset');
        log(`   📦 Séquences: ${statsBefore.sequences}`, 'reset');
        log(`   ⚙️  Fonctions: ${statsBefore.functions}`, 'reset');
        log(`   🔔 Triggers: ${statsBefore.triggers}`, 'reset');

        // Analyser le fichier de schéma
        log('\n📄 ANALYSE DU FICHIER DE SCHÉMA', 'blue');
        log('─'.repeat(80), 'gray');

        const schemaAnalysis = analyzeSchemaFile(schemaPath);
        const fileSizeKB = (schemaAnalysis.fileSize / 1024).toFixed(2);

        log(`\n📁 Fichier: schema-structure-only.sql`, 'cyan');
        log(`   📏 Taille: ${fileSizeKB} KB`, 'reset');
        log(`   📝 Lignes: ${schemaAnalysis.lines.toLocaleString()}`, 'reset');

        log('\n📦 Contenu du schéma:', 'cyan');
        log(`   📋 Tables: ${schemaAnalysis.tables}`, 'reset');
        log(`   🔑 Index: ${schemaAnalysis.indexes}`, 'reset');
        log(`   🔒 Contraintes: ${schemaAnalysis.constraints}`, 'reset');
        log(`   📦 Séquences: ${schemaAnalysis.sequences}`, 'reset');
        log(`   ⚙️  Fonctions: ${schemaAnalysis.functions}`, 'reset');
        log(`   🔔 Triggers: ${schemaAnalysis.triggers}`, 'reset');

        // Calculer les différences prévisibles
        log('\n🔄 DIFFÉRENCES ESTIMÉES', 'blue');
        log('─'.repeat(80), 'gray');

        const diff = {
            tables: schemaAnalysis.tables - statsBefore.tables,
            indexes: schemaAnalysis.indexes - statsBefore.indexes,
            constraints: schemaAnalysis.constraints - statsBefore.constraints,
            sequences: schemaAnalysis.sequences - statsBefore.sequences,
            functions: schemaAnalysis.functions - statsBefore.functions,
            triggers: schemaAnalysis.triggers - statsBefore.triggers
        };

        const formatDiff = (value) => {
            if (value > 0) return `+${value}`;
            if (value < 0) return `${value}`;
            return '0';
        };

        log('\n📊 Différences attendues:', 'cyan');
        log(`   📋 Tables: ${formatDiff(diff.tables)}`, diff.tables !== 0 ? 'yellow' : 'gray');
        log(`   🔑 Index: ${formatDiff(diff.indexes)}`, diff.indexes !== 0 ? 'yellow' : 'gray');
        log(`   🔒 Contraintes: ${formatDiff(diff.constraints)}`, diff.constraints !== 0 ? 'yellow' : 'gray');
        log(`   📦 Séquences: ${formatDiff(diff.sequences)}`, diff.sequences !== 0 ? 'yellow' : 'gray');
        log(`   ⚙  Fonctions: ${formatDiff(diff.functions)}`, diff.functions !== 0 ? 'yellow' : 'gray');
        log(`   🔔 Triggers: ${formatDiff(diff.triggers)}`, diff.triggers !== 0 ? 'yellow' : 'gray');

        const hasChanges = Object.values(diff).some(v => v !== 0);

        if (!hasChanges) {
            log('\n✅ La base de données semble déjà à jour!', 'green');
            log('💡 Vous pouvez continuer pour forcer l\'application ou annuler.', 'yellow');
        }

        // Demander confirmation
        log('\n⚠️  APPLICATION DU SCHÉMA', 'yellow');
        log('─'.repeat(80), 'gray');
        log('\nCette opération va:', 'yellow');
        log('  • Appliquer toutes les modifications du schéma', 'reset');
        log('  • Créer les éléments manquants (tables, index, etc.)', 'reset');
        log('  • Préserver toutes les données existantes', 'reset');
        log('  • Utiliser des transactions pour la sécurité', 'reset');

        const confirm = await ask('\n❓ Voulez-vous continuer? (oui/non): ');

        if (confirm.toLowerCase() !== 'oui' && confirm.toLowerCase() !== 'yes') {
            log('\n⏸️  Opération annulée par l\'utilisateur', 'yellow');
            return;
        }

        // Fermer la connexion pool temporairement
        await client.release();
        await pool.end();

        // Préparer la commande psql
        log('\n🔧 APPLICATION DU SCHÉMA VIA PSQL', 'blue');
        log('═'.repeat(80), 'cyan');

        const psqlCmd = `psql -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} -f "${schemaPath}" -q`;

        log('\n⏳ Application en cours...', 'yellow');
        log('   (Cela peut prendre quelques secondes)\n', 'gray');

        // Définir le mot de passe dans l'environnement
        const env = { ...process.env };
        if (dbConfig.password) {
            env.PGPASSWORD = dbConfig.password;
        }

        try {
            // Exécuter psql
            execSync(psqlCmd, {
                env,
                stdio: 'inherit' // Afficher la sortie en temps réel
            });

            // Nettoyer le mot de passe
            delete env.PGPASSWORD;

            log('\n✅ Application terminée sans erreur!', 'green');

        } catch (error) {
            delete env.PGPASSWORD;
            throw new Error(`Échec de l'application via psql: ${error.message}`);
        }

        // Reconnecter pour les statistiques APRÈS
        const newPool = new Pool(dbConfig);
        const newClient = await newPool.connect();

        try {
            log('\n🔍 ANALYSE APRÈS APPLICATION', 'blue');
            log('═'.repeat(80), 'cyan');

            const statsAfter = await getDatabaseStats(newClient);

            log('\n📊 État actuel (APRÈS):', 'cyan');
            log(`   📋 Tables: ${statsAfter.tables}`, 'reset');
            log(`   🔑 Index: ${statsAfter.indexes}`, 'reset');
            log(`   🔒 Contraintes: ${statsAfter.constraints}`, 'reset');
            log(`   📦 Séquences: ${statsAfter.sequences}`, 'reset');
            log(`   ⚙️  Fonctions: ${statsAfter.functions}`, 'reset');
            log(`   🔔 Triggers: ${statsAfter.triggers}`, 'reset');

            // Calculer les changements réels
            log('\n📈 CHANGEMENTS APPLIQUÉS', 'blue');
            log('═'.repeat(80), 'cyan');

            const actualDiff = {
                tables: statsAfter.tables - statsBefore.tables,
                indexes: statsAfter.indexes - statsBefore.indexes,
                constraints: statsAfter.constraints - statsBefore.constraints,
                sequences: statsAfter.sequences - statsBefore.sequences,
                functions: statsAfter.functions - statsBefore.functions,
                triggers: statsAfter.triggers - statsBefore.triggers
            };

            log('\n✅ Résumé des modifications:', 'green');

            if (actualDiff.tables !== 0) {
                log(`   📋 Tables: ${formatDiff(actualDiff.tables)}`, actualDiff.tables > 0 ? 'green' : 'yellow');
            }
            if (actualDiff.indexes !== 0) {
                log(`   🔑 Index: ${formatDiff(actualDiff.indexes)}`, actualDiff.indexes > 0 ? 'green' : 'yellow');
            }
            if (actualDiff.constraints !== 0) {
                log(`   🔒 Contraintes: ${formatDiff(actualDiff.constraints)}`, actualDiff.constraints > 0 ? 'green' : 'yellow');
            }
            if (actualDiff.sequences !== 0) {
                log(`   📦 Séquences: ${formatDiff(actualDiff.sequences)}`, actualDiff.sequences > 0 ? 'green' : 'yellow');
            }
            if (actualDiff.functions !== 0) {
                log(`   ⚙️  Fonctions: ${formatDiff(actualDiff.functions)}`, actualDiff.functions > 0 ? 'green' : 'yellow');
            }
            if (actualDiff.triggers !== 0) {
                log(`   🔔 Triggers: ${formatDiff(actualDiff.triggers)}`, actualDiff.triggers > 0 ? 'green' : 'yellow');
            }

            const totalChanges = Object.values(actualDiff).reduce((sum, val) => sum + Math.abs(val), 0);

            if (totalChanges === 0) {
                log('\n   ℹ️  Aucun changement détecté (schéma déjà à jour)', 'gray');
            }

            log('\n🎯 PROCHAINES ÉTAPES', 'blue');
            log('═'.repeat(80), 'cyan');
            log('\n1. Redémarrer l\'application:', 'yellow');
            log('   pm2 restart ebvision', 'reset');
            log('\n2. Vérifier les logs:', 'yellow');
            log('   pm2 logs ebvision --lines 50', 'reset');
            log('\n3. Tester les fonctionnalités:', 'yellow');
            log('   • Saisie de temps', 'reset');
            log('   • Soumission', 'reset');
            log('   • Approbation', 'reset');
            log('   • Rapports', 'reset');
            log('');

        } finally {
            newClient.release();
            await newPool.end();
        }

    } catch (error) {
        log('\n❌ ERREUR lors de l\'application du schéma', 'red');
        log('═'.repeat(80), 'cyan');

        if (error.message.includes('psql')) {
            log('\n💡 Vérifiez que:', 'yellow');
            log('   - psql est installé et accessible dans le PATH', 'reset');
            log('   - Les informations de connexion sont correctes', 'reset');
            log('   - La base de données est accessible', 'reset');
        } else {
            log(`\nDétails: ${error.message}`, 'reset');
        }

        log('');
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Exécution
if (require.main === module) {
    applySchema()
        .then(() => {
            log('✅ Script terminé avec succès\n', 'green');
            process.exit(0);
        })
        .catch((error) => {
            log(`\n❌ Erreur fatale: ${error.message}`, 'red');
            process.exit(1);
        });
}

module.exports = { applySchema };
