#!/usr/bin/env node
/**
 * 🔍 VÉRIFICATEUR DE SCHÉMA DE PRODUCTION
 * ========================================
 * 
 * Vérifie que le schéma de production est conforme au schéma local
 * 
 * Usage: node scripts/database/verify-production-schema.js
 */

require('dotenv').config();
const { Pool } = require('pg');

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

async function verifySchema() {
    const client = await pool.connect();

    try {
        console.log('\n🔍 VÉRIFICATION DU SCHÉMA DE PRODUCTION\n');
        console.log('Database:', process.env.DB_NAME || 'ebvision');
        console.log('Host:', process.env.DB_HOST || 'localhost');
        console.log('\n' + '='.repeat(80) + '\n');

        // Tables critiques à vérifier
        const criticalTables = {
            'time_sheets': {
                required: ['id', 'user_id', 'week_start', 'week_end', 'statut', 'created_at', 'updated_at'],
                forbidden: ['status']
            },
            'time_entries': {
                required: ['id', 'time_sheet_id', 'user_id', 'date_saisie', 'heures', 'created_at', 'updated_at'],
                forbidden: ['statut', 'status'] // NI statut NI status dans time_entries
            },
            'time_sheet_approvals': {
                required: ['id', 'time_sheet_id', 'approver_id', 'statut', 'created_at', 'updated_at'],
                forbidden: ['status']
            }
        };

        let hasErrors = false;

        for (const [tableName, schema] of Object.entries(criticalTables)) {
            console.log(`\n📋 Table: ${tableName}`);
            console.log('-'.repeat(80));

            // Vérifier si la table existe
            const tableExistsQuery = `
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = $1
                )`;
            const tableExists = await client.query(tableExistsQuery, [tableName]);

            if (!tableExists.rows[0].exists) {
                console.log(`  ❌ Table manquante: ${tableName}`);
                hasErrors = true;
                continue;
            }

            // Obtenir les colonnes existantes
            const columnsQuery = `
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = $1
                ORDER BY ordinal_position`;
            const columnsResult = await client.query(columnsQuery, [tableName]);
            const existingColumns = columnsResult.rows.map(r => r.column_name);

            console.log(`  ✓ Table trouvée avec ${existingColumns.length} colonnes`);

            // Vérifier les colonnes requises
            let tableMissing = [];
            for (const reqCol of schema.required) {
                if (!existingColumns.includes(reqCol)) {
                    tableMissing.push(reqCol);
                    hasErrors = true;
                }
            }

            if (tableMissing.length > 0) {
                console.log(`  ❌ Colonnes manquantes: ${tableMissing.join(', ')}`);
            } else {
                console.log(`  ✅ Toutes les colonnes requises présentes`);
            }

            // Vérifier les colonnes interdites
            let tableForbidden = [];
            for (const forbCol of schema.forbidden) {
                if (existingColumns.includes(forbCol)) {
                    tableForbidden.push(forbCol);
                    hasErrors = true;
                }
            }

            if (tableForbidden.length > 0) {
                console.log(`  ⚠️  Colonnes interdites présentes: ${tableForbidden.join(', ')}`);
            } else {
                console.log(`  ✅ Aucune colonne interdite présente`);
            }

            // Afficher toutes les colonnes
            console.log(`\n  📝 Colonnes existantes:`);
            for (const col of columnsResult.rows) {
                const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                const defaultVal = col.column_default ? `DEFAULT ${col.column_default.substring(0, 30)}` : '';
                console.log(`     - ${col.column_name} (${col.data_type}) ${nullable} ${defaultVal}`);
            }
        }

        console.log('\n' + '='.repeat(80));

        if (hasErrors) {
            console.log('\n❌ SCHÉMA NON CONFORME - Des corrections sont nécessaires\n');
            console.log('💡 Actions recommandées:');
            console.log('   1. En local: node scripts/database/generate-schema.js');
            console.log('   2. git add && git commit && git push');
            console.log('   3. En production: git pull && node scripts/database/apply-schema.js');
            console.log('');
        } else {
            console.log('\n✅ SCHÉMA CONFORME - Toutes les vérifications passées!\n');
        }

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error(error);
    } finally {
        client.release();
        await pool.end();
    }
}

verifySchema();
