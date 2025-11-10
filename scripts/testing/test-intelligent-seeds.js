#!/usr/bin/env node

/**
 * Script de test pour vérifier le comportement intelligent des scripts de seed
 * Vérifie que les scripts détectent correctement l'existant et n'ajoutent que ce qui manque
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Configuration PostgreSQL
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ewm_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
};

// Couleurs pour l'affichage console
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testIntelligentSeeds() {
    log('\n╔══════════════════════════════════════════════════════════════╗', 'bright');
    log('║     TEST - COMPORTEMENT INTELLIGENT DES SCRIPTS SEED        ║', 'bright');
    log('╚══════════════════════════════════════════════════════════════╝', 'bright');

    const pool = new Pool(dbConfig);

    try {
        log('\n📡 Connexion à la base de données...', 'cyan');
        await pool.query('SELECT NOW()');
        log('✅ Connexion réussie!', 'green');

        // Test 1: Types de Collaborateurs
        log('\n' + '='.repeat(60), 'blue');
        log('TEST 1: Types de Collaborateurs', 'cyan');
        log('='.repeat(60), 'blue');

        const typesResult = await pool.query('SELECT code, nom FROM types_collaborateurs ORDER BY code');
        log(`\n📊 Types actuels en base: ${typesResult.rows.length}`, 'cyan');
        
        if (typesResult.rows.length > 0) {
            typesResult.rows.forEach(type => {
                log(`   - ${type.code}: ${type.nom}`, 'blue');
            });
        } else {
            log('   (Aucun type existant)', 'yellow');
        }

        const expectedTypes = ['ADM', 'TEC', 'CONS', 'SUP'];
        const existingTypeCodes = typesResult.rows.map(t => t.code);
        const missingTypes = expectedTypes.filter(code => !existingTypeCodes.includes(code));
        const extraTypes = existingTypeCodes.filter(code => !expectedTypes.includes(code));

        log('\n🔍 Analyse:', 'cyan');
        log(`   Types attendus    : ${expectedTypes.join(', ')}`, 'blue');
        log(`   Types manquants   : ${missingTypes.length > 0 ? missingTypes.join(', ') : 'Aucun'}`, 
            missingTypes.length > 0 ? 'yellow' : 'green');
        log(`   Types en plus     : ${extraTypes.length > 0 ? extraTypes.join(', ') : 'Aucun'}`, 
            extraTypes.length > 0 ? 'yellow' : 'green');

        if (missingTypes.length === 0 && extraTypes.length === 0) {
            log('   ✅ Configuration parfaite!', 'green');
        } else if (missingTypes.length > 0) {
            log(`   ⚠️  Le script devrait créer: ${missingTypes.join(', ')}`, 'yellow');
        }

        // Test 2: Grades
        log('\n' + '='.repeat(60), 'blue');
        log('TEST 2: Grades', 'cyan');
        log('='.repeat(60), 'blue');

        const gradesResult = await pool.query('SELECT code, nom, niveau FROM grades ORDER BY niveau DESC');
        log(`\n📊 Grades actuels en base: ${gradesResult.rows.length}`, 'cyan');
        
        if (gradesResult.rows.length > 0) {
            gradesResult.rows.forEach(grade => {
                log(`   - Niveau ${grade.niveau}: ${grade.code} - ${grade.nom}`, 'blue');
            });
        } else {
            log('   (Aucun grade existant)', 'yellow');
        }

        const expectedGrades = ['ASSOC', 'MGR', 'SEN', 'ASST', 'JUN', 'STAG'];
        const existingGradeCodes = gradesResult.rows.map(g => g.code);
        const missingGrades = expectedGrades.filter(code => !existingGradeCodes.includes(code));
        const extraGrades = existingGradeCodes.filter(code => !expectedGrades.includes(code));

        log('\n🔍 Analyse:', 'cyan');
        log(`   Grades attendus   : ${expectedGrades.join(', ')}`, 'blue');
        log(`   Grades manquants  : ${missingGrades.length > 0 ? missingGrades.join(', ') : 'Aucun'}`, 
            missingGrades.length > 0 ? 'yellow' : 'green');
        log(`   Grades en plus    : ${extraGrades.length > 0 ? extraGrades.join(', ') : 'Aucun'}`, 
            extraGrades.length > 0 ? 'yellow' : 'green');

        if (missingGrades.length === 0 && extraGrades.length === 0) {
            log('   ✅ Configuration parfaite!', 'green');
        } else if (missingGrades.length > 0) {
            log(`   ⚠️  Le script devrait créer: ${missingGrades.join(', ')}`, 'yellow');
        }

        // Test 3: Postes
        log('\n' + '='.repeat(60), 'blue');
        log('TEST 3: Postes', 'cyan');
        log('='.repeat(60), 'blue');

        const postesResult = await pool.query('SELECT code, nom FROM postes ORDER BY code');
        log(`\n📊 Postes actuels en base: ${postesResult.rows.length}`, 'cyan');
        
        if (postesResult.rows.length > 0) {
            postesResult.rows.forEach(poste => {
                log(`   - ${poste.code}: ${poste.nom}`, 'blue');
            });
        } else {
            log('   (Aucun poste existant)', 'yellow');
        }

        const expectedPostes = ['DG', 'DOPS', 'DIR', 'RESPIT', 'SEC', 'SUPIT'];
        const existingPosteCodes = postesResult.rows.map(p => p.code);
        const missingPostes = expectedPostes.filter(code => !existingPosteCodes.includes(code));
        const extraPostes = existingPosteCodes.filter(code => !expectedPostes.includes(code));

        log('\n🔍 Analyse:', 'cyan');
        log(`   Postes attendus   : ${expectedPostes.join(', ')}`, 'blue');
        log(`   Postes manquants  : ${missingPostes.length > 0 ? missingPostes.join(', ') : 'Aucun'}`, 
            missingPostes.length > 0 ? 'yellow' : 'green');
        log(`   Postes en plus    : ${extraPostes.length > 0 ? extraPostes.join(', ') : 'Aucun'}`, 
            extraPostes.length > 0 ? 'yellow' : 'green');

        if (missingPostes.length === 0 && extraPostes.length === 0) {
            log('   ✅ Configuration parfaite!', 'green');
        } else if (missingPostes.length > 0) {
            log(`   ⚠️  Le script devrait créer: ${missingPostes.join(', ')}`, 'yellow');
        }

        // Résumé final
        log('\n╔══════════════════════════════════════════════════════════════╗', 'bright');
        log('║                    RÉSUMÉ DE L\'ANALYSE                       ║', 'bright');
        log('╚══════════════════════════════════════════════════════════════╝', 'bright');

        const totalExpected = expectedTypes.length + expectedGrades.length + expectedPostes.length;
        const totalExisting = typesResult.rows.length + gradesResult.rows.length + postesResult.rows.length;
        const totalMissing = missingTypes.length + missingGrades.length + missingPostes.length;
        const totalExtra = extraTypes.length + extraGrades.length + extraPostes.length;

        log('\n📊 Statistiques globales:', 'cyan');
        log(`   Total attendu     : ${totalExpected} éléments (4 types + 6 grades + 6 postes)`, 'blue');
        log(`   Total en base     : ${totalExisting} éléments`, 'blue');
        log(`   Éléments manquants: ${totalMissing}`, totalMissing > 0 ? 'yellow' : 'green');
        log(`   Éléments en plus  : ${totalExtra}`, totalExtra > 0 ? 'yellow' : 'green');

        log('\n💡 Recommandations:', 'cyan');
        if (totalMissing > 0) {
            log('   ▶ Exécuter les scripts de seed pour créer les éléments manquants:', 'yellow');
            if (missingTypes.length > 0) {
                log('     node scripts/database/seed-types-collaborateurs.js', 'yellow');
            }
            if (missingGrades.length > 0) {
                log('     node scripts/database/seed-grades.js', 'yellow');
            }
            if (missingPostes.length > 0) {
                log('     node scripts/database/seed-postes.js', 'yellow');
            }
        } else {
            log('   ✅ Tous les éléments standard sont présents!', 'green');
            log('   ▶ Vous pouvez réexécuter les scripts en toute sécurité', 'blue');
            log('     Les scripts détecteront que tout est à jour et ne feront rien', 'blue');
        }

        if (totalExtra > 0) {
            log('\n   ℹ️  Des éléments personnalisés ont été détectés:', 'cyan');
            log('     Les scripts de seed les conserveront intacts', 'blue');
        }

        log('\n✅ Test terminé avec succès!\n', 'green');

    } catch (error) {
        log('\n❌ Erreur lors du test:', 'red');
        console.error(error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Lancer les tests
testIntelligentSeeds();


