const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function verifySchema() {
    try {
        const client = await pool.connect();

        console.log('🔍 VÉRIFICATION DU SCHÉMA\n');
        console.log('='
            .repeat(60));

        // Tables des migrations récentes à vérifier
        const criticalChecks = [
            {
                name: 'validation_companies',
                query: "SELECT to_regclass('public.prospecting_campaign_validation_companies') as exists",
                migration: 'create_validation_companies_table.sql'
            },
            {
                name: 'payments',
                query: "SELECT to_regclass('public.payments') as exists",
                migration: '019_create_payments.sql'
            },
            {
                name: 'payment_allocations',
                query: "SELECT to_regclass('public.payment_allocations') as exists",
                migration: '020_create_payment_allocations.sql'
            },
            {
                name: 'manager_id in missions',
                query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'missions' AND column_name = 'manager_id'",
                migration: '023_add_manager_id_to_missions.sql'
            },
            {
                name: 'bank_accounts',
                query: "SELECT to_regclass('public.bank_accounts') as exists",
                migration: '018_create_bank_accounts.sql'
            },
            {
                name: 'financial_institutions',
                query: "SELECT to_regclass('public.financial_institutions') as exists",
                migration: '017_create_financial_institutions.sql'
            }
        ];

        let missingCount = 0;
        let presentCount = 0;

        for (const check of criticalChecks) {
            const result = await client.query(check.query);
            const exists = result.rows.length > 0 && (result.rows[0].exists !== null || result.rows[0].column_name);

            if (exists) {
                console.log(`✅ ${check.name.padEnd(40)} PRÉSENT`);
                presentCount++;
            } else {
                console.log(`❌ ${check.name.padEnd(40)} MANQUANT`);
                console.log(`   Migration: ${check.migration}`);
                missingCount++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`\n📊 RÉSULTAT:`);
        console.log(`   ✅ Présents : ${presentCount}/${criticalChecks.length}`);
        console.log(`   ❌ Manquants: ${missingCount}/${criticalChecks.length}`);

        if (missingCount > 0) {
            console.log('\n⚠️  CONCLUSION:');
            console.log('   Le fichier schema-structure-only.sql est OBSOLÈTE.');
            console.log(`   Il lui manque ${missingCount} changements des migrations récentes.`);
            console.log('\n💡 Solution:');
            console.log('   1. Exporter le schéma complet de votre base actuelle');
            console.log('   2. Remplacer schema-structure-only.sql');
            console.log('\n   Commande:');
            console.log('   pg_dump -h localhost -U postgres -d EB-PostProd2 --schema-only > scripts/database/schema-structure-only.sql');
        } else {
            console.log('\n✅ Le schéma est à jour !');
        }

        client.release();
    } catch (e) {
        console.error('Erreur:', e.message);
    } finally {
        pool.end();
    }
}

verifySchema();
