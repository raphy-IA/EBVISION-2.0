#!/usr/bin/env node
/**
 * 📦 GÉNÉRATEUR DE SCHÉMA
 * ======================
 * 
 * Génère le fichier schema-structure-only.sql depuis la BD configurée dans .env
 * 
 * Usage: node scripts/database/generate-schema.js
 * 
 * Ce script doit être exécuté en LOCAL pour capturer l'état actuel de la BD de développement
 */

require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function generateSchema() {
    try {
        log('\n📦 GÉNÉRATION DU SCHÉMA DE BASE DE DONNÉES', 'blue');
        log('═'.repeat(60), 'cyan');

        // Lire la configuration depuis .env
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'ebvision',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD
        };

        log('\n📋 Configuration détectée:', 'cyan');
        log(`   🗄️  Base de données: ${dbConfig.database}`, 'reset');
        log(`   🖥️  Hôte: ${dbConfig.host}:${dbConfig.port}`, 'reset');
        log(`   👤 Utilisateur: ${dbConfig.user}`, 'reset');

        // Chemin de sortie
        const outputPath = path.join(__dirname, 'schema-structure-only.sql');

        log('\n🔨 Génération du schéma en cours...', 'yellow');

        // Commande pg_dump
        const pgDumpCmd = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} --schema-only`;

        // Définir le mot de passe dans l'environnement
        const env = { ...process.env };
        if (dbConfig.password) {
            env.PGPASSWORD = dbConfig.password;
        }

        // Exécuter pg_dump
        const schema = execSync(pgDumpCmd, {
            env,
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        });

        // Nettoyer PGPASSWORD
        delete env.PGPASSWORD;

        // Écrire le fichier
        fs.writeFileSync(outputPath, schema, 'utf8');

        // Statistiques
        const fileSize = fs.statSync(outputPath).size;
        const fileSizeKB = (fileSize / 1024).toFixed(2);
        const lines = schema.split('\n').length;

        log('\n✅ SCHÉMA GÉNÉRÉ AVEC SUCCÈS!', 'green');
        log('═'.repeat(60), 'cyan');
        log(`\n📄 Fichier: ${outputPath}`, 'cyan');
        log(`📏 Taille: ${fileSizeKB} KB`, 'reset');
        log(`📊 Lignes: ${lines.toLocaleString()}`, 'reset');

        // Compter les éléments
        const tableCount = (schema.match(/CREATE TABLE/g) || []).length;
        const indexCount = (schema.match(/CREATE.*INDEX/g) || []).length;
        const constraintCount = (schema.match(/ADD CONSTRAINT/g) || []).length;

        log('\n📦 Contenu du schéma:', 'cyan');
        log(`   📋 Tables: ${tableCount}`, 'reset');
        log(`   🔑 Index: ${indexCount}`, 'reset');
        log(`   🔒 Contraintes: ${constraintCount}`, 'reset');

        log('\n🎯 PROCHAINES ÉTAPES:', 'blue');
        log('═'.repeat(60), 'cyan');
        log('   1. Vérifier le fichier généré:', 'yellow');
        log(`      cat ${outputPath} | head -n 50`, 'reset');
        log('\n   2. Commiter et pusher:', 'yellow');
        log('      git add scripts/database/schema-structure-only.sql', 'reset');
        log('      git commit -m "chore: Update database schema"', 'reset');
        log('      git push origin main', 'reset');
        log('\n   3. En production:', 'yellow');
        log('      cd ~/apps/ebvision', 'reset');
        log('      git pull origin main', 'reset');
        log('      node scripts/database/apply-schema.js', 'reset');
        log('');

    } catch (error) {
        log('\n❌ ERREUR lors de la génération du schéma', 'red');
        log('═'.repeat(60), 'cyan');

        if (error.message.includes('pg_dump')) {
            log('\n💡 Vérifiez que:', 'yellow');
            log('   - PostgreSQL est installé et pg_dump est dans le PATH', 'reset');
            log('   - Les informations de connexion dans .env sont correctes', 'reset');
            log('   - La base de données existe et est accessible', 'reset');
        } else {
            log(`\nDétails: ${error.message}`, 'reset');
        }

        log('');
        process.exit(1);
    }
}

// Exécution
if (require.main === module) {
    generateSchema()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            log(`\n❌ Erreur fatale: ${error.message}`, 'red');
            process.exit(1);
        });
}

module.exports = { generateSchema };
