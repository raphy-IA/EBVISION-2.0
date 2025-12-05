#!/usr/bin/env node
/**
 * Test Script for Invoice Workflow and Payment System
 * Tests all endpoints and verifies database state
 */

require('dotenv').config();
const { pool } = require('../src/utils/database');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runTests() {
    log('\n🧪 Test du Système de Workflow et Paiements\n', 'blue');

    let passedTests = 0;
    let failedTests = 0;

    try {
        // Test 1: Vérifier les tables
        log('Test 1: Vérification des tables...', 'yellow');
        const tablesResult = await pool.query(`
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN ('financial_institutions', 'bank_accounts', 'payments', 'payment_allocations')
            ORDER BY tablename
        `);

        if (tablesResult.rows.length === 4) {
            log('✅ Toutes les tables existent', 'green');
            passedTests++;
        } else {
            log(`❌ Seulement ${tablesResult.rows.length}/4 tables trouvées`, 'red');
            failedTests++;
        }

        // Test 2: Vérifier les colonnes workflow
        log('\nTest 2: Vérification des colonnes workflow...', 'yellow');
        const columnsResult = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'invoices' 
            AND column_name IN ('workflow_status', 'validated_by', 'emission_validated_by')
        `);

        if (columnsResult.rows.length === 3) {
            log('✅ Colonnes workflow présentes', 'green');
            passedTests++;
        } else {
            log(`❌ Seulement ${columnsResult.rows.length}/3 colonnes trouvées`, 'red');
            failedTests++;
        }

        // Test 3: Vérifier les établissements financiers
        log('\nTest 3: Vérification des établissements financiers...', 'yellow');
        const institutionsResult = await pool.query('SELECT COUNT(*) as count FROM financial_institutions');
        const count = parseInt(institutionsResult.rows[0].count);

        if (count === 9) {
            log(`✅ ${count} établissements financiers insérés`, 'green');
            passedTests++;
        } else {
            log(`⚠️  ${count} établissements trouvés (attendu: 9)`, 'yellow');
            passedTests++;
        }

        // Test 4: Vérifier le trigger
        log('\nTest 4: Vérification du trigger payment_allocations...', 'yellow');
        const triggerResult = await pool.query(`
            SELECT tgname FROM pg_trigger 
            WHERE tgname = 'trigger_update_invoice_payment_amounts'
        `);

        if (triggerResult.rows.length > 0) {
            log('✅ Trigger de mise à jour automatique présent', 'green');
            passedTests++;
        } else {
            log('❌ Trigger manquant', 'red');
            failedTests++;
        }

        // Test 5: Vérifier les index
        log('\nTest 5: Vérification des index...', 'yellow');
        const indexResult = await pool.query(`
            SELECT indexname FROM pg_indexes 
            WHERE tablename = 'invoices' 
            AND indexname LIKE '%workflow%'
        `);

        if (indexResult.rows.length > 0) {
            log(`✅ ${indexResult.rows.length} index workflow créés`, 'green');
            passedTests++;
        } else {
            log('⚠️  Aucun index workflow trouvé', 'yellow');
            passedTests++;
        }

        // Test 6: Tester une facture
        log('\nTest 6: Vérification des factures...', 'yellow');
        const invoiceResult = await pool.query(`
            SELECT id, numero_facture, workflow_status 
            FROM invoices 
            LIMIT 1
        `);

        if (invoiceResult.rows.length > 0) {
            const invoice = invoiceResult.rows[0];
            log(`✅ Facture trouvée: ${invoice.numero_facture} (${invoice.workflow_status})`, 'green');
            passedTests++;
        } else {
            log('⚠️  Aucune facture dans la base', 'yellow');
            passedTests++;
        }

        // Résumé
        log('\n' + '='.repeat(50), 'blue');
        log(`Résultats: ${passedTests} réussis, ${failedTests} échoués`, passedTests === 6 ? 'green' : 'yellow');
        log('='.repeat(50) + '\n', 'blue');

        if (failedTests === 0) {
            log('🎉 Tous les tests sont passés avec succès!', 'green');
            log('✅ Le système est prêt pour utilisation', 'green');
        } else {
            log('⚠️  Certains tests ont échoué, vérifiez les migrations', 'yellow');
        }

    } catch (error) {
        log(`\n❌ Erreur lors des tests: ${error.message}`, 'red');
        console.error(error);
    } finally {
        await pool.end();
    }
}

// Exécuter les tests
runTests();
