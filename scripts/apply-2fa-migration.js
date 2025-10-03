#!/usr/bin/env node

/**
 * Script pour appliquer la migration 2FA
 * Usage: node scripts/apply-2fa-migration.js
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../src/utils/database');

console.log('🔐 APPLICATION DE LA MIGRATION 2FA');
console.log('==================================\n');

async function applyMigration() {
    try {
        // Lire le fichier de migration
        const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '049_add_two_factor_auth.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📋 Exécution de la migration 2FA...');
        
        // Exécuter la migration
        await pool.query(migrationSQL);
        
        console.log('✅ Migration 2FA appliquée avec succès !');
        
        // Vérifier que les colonnes ont été ajoutées
        console.log('\n🔍 Vérification des colonnes ajoutées...');
        
        const columnsResult = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('two_factor_secret', 'two_factor_enabled', 'last_2fa_used', 'backup_codes')
            ORDER BY column_name
        `);
        
        if (columnsResult.rows.length === 4) {
            console.log('✅ Toutes les colonnes 2FA ont été ajoutées:');
            columnsResult.rows.forEach(col => {
                console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
            });
        } else {
            console.log('⚠️  Certaines colonnes 2FA sont manquantes');
        }
        
        // Vérifier la table d'audit
        console.log('\n🔍 Vérification de la table d\'audit...');
        
        const tableResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'two_factor_attempts'
        `);
        
        if (tableResult.rows.length > 0) {
            console.log('✅ Table d\'audit two_factor_attempts créée');
        } else {
            console.log('❌ Table d\'audit two_factor_attempts manquante');
        }
        
        // Vérifier les index
        console.log('\n🔍 Vérification des index...');
        
        const indexResult = await pool.query(`
            SELECT indexname, indexdef
            FROM pg_indexes 
            WHERE tablename = 'users' 
            AND indexname LIKE '%two_factor%'
        `);
        
        if (indexResult.rows.length > 0) {
            console.log('✅ Index 2FA créés:');
            indexResult.rows.forEach(idx => {
                console.log(`   - ${idx.indexname}`);
            });
        } else {
            console.log('⚠️  Index 2FA manquants');
        }
        
        console.log('\n🎉 Migration 2FA terminée avec succès !');
        console.log('\n📝 Prochaines étapes:');
        console.log('   1. Redémarrer l\'application');
        console.log('   2. Tester la configuration 2FA');
        console.log('   3. Former les utilisateurs à l\'utilisation du 2FA');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'application de la migration:', error);
        console.error('Détails:', error.message);
    } finally {
        await pool.end();
    }
}

// Exécuter la migration
applyMigration();
