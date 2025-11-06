#!/usr/bin/env node

/**
 * SCRIPT DE VÉRIFICATION EN MODE DRY-RUN (SANS MODIFICATION)
 * ===========================================================
 * 
 * Ce script vérifie la structure de la base de données SANS rien modifier.
 * Il affiche uniquement ce qui serait corrigé, sans faire de changements.
 * 
 * Usage: node scripts/database/verify-database-dry-run.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const { EXPECTED_SCHEMA } = require('./verify-and-fix-database.js');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});

async function tableExists(tableName) {
    const result = await pool.query(`
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
        )
    `, [tableName]);
    return result.rows[0].exists;
}

async function columnExists(tableName, columnName) {
    const result = await pool.query(`
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = $1 
            AND column_name = $2
        )
    `, [tableName, columnName]);
    return result.rows[0].exists;
}

async function dryRun() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║     VÉRIFICATION DRY-RUN (AUCUNE MODIFICATION)             ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    console.log('📋 Configuration PostgreSQL:');
    console.log(`   🏠 Hôte       : ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   🔌 Port       : ${process.env.DB_PORT || '5432'}`);
    console.log(`   👤 Utilisateur: ${process.env.DB_USER || 'Non défini'}`);
    console.log(`   🗄️  Base      : ${process.env.DB_NAME || 'Non définie'}\n`);
    
    try {
        await pool.query('SELECT NOW()');
        console.log('✅ Connexion à la base de données réussie\n');
        
        const changes = {
            tablesToCreate: [],
            columnsToAdd: [],
            allOk: true
        };
        
        console.log('🔍 Vérification de la structure (mode lecture seule)...\n');
        
        for (const [tableName, schema] of Object.entries(EXPECTED_SCHEMA)) {
            console.log(`📊 Table: ${tableName}`);
            const exists = await tableExists(tableName);
            
            if (!exists) {
                if (schema.optional) {
                    console.log(`   ⚠️  Table optionnelle manquante (serait créée si nécessaire)`);
                } else {
                    console.log(`   ❌ Table manquante (serait créée)`);
                    changes.allOk = false;
                    changes.tablesToCreate.push(tableName);
                }
            } else {
                console.log(`   ✅ Table existe`);
                
                for (const column of schema.columns) {
                    const colExists = await columnExists(tableName, column.name);
                    if (!colExists) {
                        console.log(`   ❌ Colonne "${column.name}" manquante (serait ajoutée)`);
                        changes.allOk = false;
                        changes.columnsToAdd.push({
                            table: tableName,
                            column: column.name,
                            type: column.type,
                            default: column.default || null
                        });
                    } else {
                        console.log(`   ✅ Colonne "${column.name}" existe`);
                    }
                }
            }
            console.log('');
        }
        
        // Résumé
        console.log('╔══════════════════════════════════════════════════════════════╗');
        console.log('║              ✅ VÉRIFICATION TERMINÉE                       ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
        
        if (changes.allOk) {
            console.log('✅ La structure est complète et à jour !');
            console.log('   Aucune modification nécessaire.\n');
        } else {
            console.log('📋 CHANGEMENTS QUI SERAIENT APPLIQUÉS :\n');
            
            if (changes.tablesToCreate.length > 0) {
                console.log(`   📦 ${changes.tablesToCreate.length} table(s) à créer :`);
                changes.tablesToCreate.forEach(t => console.log(`      - ${t}`));
                console.log('');
            }
            
            if (changes.columnsToAdd.length > 0) {
                console.log(`   📝 ${changes.columnsToAdd.length} colonne(s) à ajouter :`);
                changes.columnsToAdd.forEach(({ table, column, type, default: def }) => {
                    const defaultStr = def ? ` DEFAULT ${def}` : '';
                    console.log(`      - ${table}.${column} (${type}${defaultStr})`);
                });
                console.log('');
            }
            
            console.log('💡 Pour appliquer ces changements :');
            console.log('   node scripts/database/verify-and-fix-database.js\n');
        }
        
    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    dryRun().catch(console.error);
}

module.exports = { dryRun };

