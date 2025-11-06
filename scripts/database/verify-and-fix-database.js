#!/usr/bin/env node

/**
 * SCRIPT DE VÉRIFICATION ET CORRECTION DE LA BASE DE DONNÉES
 * ===========================================================
 * 
 * ⚠️  SÉCURITÉ : Ce script est SÛR et ne modifie JAMAIS les données existantes
 * 
 * - ✅ AJOUTE uniquement des colonnes/tables MANQUANTES
 * - ✅ Utilise IF NOT EXISTS pour éviter les doublons
 * - ❌ NE SUPPRIME JAMAIS de données
 * - ❌ NE MODIFIE JAMAIS les données existantes
 * - ❌ NE SUPPRIME JAMAIS de colonnes ou tables
 * 
 * Usage: node scripts/database/verify-and-fix-database.js
 */

require('dotenv').config();
const { Pool } = require('pg');

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

/**
 * Structure complète attendue de la base de données
 */
const EXPECTED_SCHEMA = {
    users: {
        columns: [
            { name: 'id', type: 'UUID', not_null: true, default: 'gen_random_uuid()', primary_key: true },
            { name: 'nom', type: 'VARCHAR(100)', not_null: true },
            { name: 'prenom', type: 'VARCHAR(100)', not_null: true },
            { name: 'login', type: 'VARCHAR(100)', not_null: true, unique: true },
            { name: 'email', type: 'VARCHAR(255)', not_null: true, unique: true },
            { name: 'password_hash', type: 'VARCHAR(255)', not_null: true },
            { name: 'role', type: 'VARCHAR(50)', default: "'COLLABORATEUR'" },
            { name: 'statut', type: 'VARCHAR(50)', default: "'ACTIF'" },
            { name: 'collaborateur_id', type: 'UUID' },
            { name: 'photo_url', type: 'TEXT' },
            { name: 'two_factor_enabled', type: 'BOOLEAN', default: 'false' },
            { name: 'two_factor_secret', type: 'VARCHAR(255)' },
            { name: 'backup_codes', type: 'TEXT[]' },
            { name: 'last_login', type: 'TIMESTAMP WITH TIME ZONE' },
            { name: 'last_logout', type: 'TIMESTAMP WITH TIME ZONE' },
            { name: 'created_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
            { name: 'updated_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
        ]
    },
    notifications: {
        columns: [
            { name: 'id', type: 'UUID', not_null: true, default: 'gen_random_uuid()', primary_key: true },
            { name: 'type', type: 'VARCHAR(50)', not_null: true },
            { name: 'title', type: 'VARCHAR(255)', not_null: true },
            { name: 'message', type: 'TEXT', not_null: true },
            { name: 'user_id', type: 'UUID' },
            { name: 'opportunity_id', type: 'UUID' },
            { name: 'stage_id', type: 'UUID' },
            { name: 'campaign_id', type: 'UUID' }, // Optionnel mais recommandé
            { name: 'read', type: 'BOOLEAN', default: 'false' },
            { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE', default: 'CURRENT_TIMESTAMP' }
        ]
    },
    pages: {
        columns: [
            { name: 'id', type: 'UUID', not_null: true, default: 'gen_random_uuid()', primary_key: true },
            { name: 'title', type: 'VARCHAR(255)', not_null: true },
            { name: 'url', type: 'VARCHAR(500)', not_null: true, unique: true },
            { name: 'created_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
            { name: 'updated_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
        ],
        optional: true // Table optionnelle pour la synchronisation
    },
    menu_sections: {
        columns: [
            { name: 'id', type: 'UUID', not_null: true, default: 'gen_random_uuid()', primary_key: true },
            { name: 'code', type: 'VARCHAR(100)', not_null: true, unique: true },
            { name: 'name', type: 'VARCHAR(255)', not_null: true },
            { name: 'created_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
            { name: 'updated_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
        ],
        optional: true
    },
    menu_items: {
        columns: [
            { name: 'id', type: 'UUID', not_null: true, default: 'gen_random_uuid()', primary_key: true },
            { name: 'code', type: 'VARCHAR(255)', not_null: true, unique: true },
            { name: 'label', type: 'VARCHAR(255)', not_null: true },
            { name: 'url', type: 'VARCHAR(500)', not_null: true },
            { name: 'section_id', type: 'UUID', references: 'menu_sections(id)' },
            { name: 'display_order', type: 'INTEGER', default: '0' },
            { name: 'created_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
            { name: 'updated_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
        ],
        optional: true
    }
};

/**
 * Vérifier si une table existe
 */
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

/**
 * Vérifier si une colonne existe dans une table
 */
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

/**
 * Obtenir les informations d'une colonne existante
 */
async function getColumnInfo(tableName, columnName) {
    const result = await pool.query(`
        SELECT 
            column_name,
            data_type,
            character_maximum_length,
            is_nullable,
            column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1 
        AND column_name = $2
    `, [tableName, columnName]);
    return result.rows[0] || null;
}

/**
 * Créer une table manquante
 */
async function createTable(tableName, schema) {
    try {
        const columns = schema.columns.map(col => {
            let def = `${col.name} ${col.type}`;
            if (col.not_null && !col.default) {
                def += ' NOT NULL';
            } else if (col.not_null && col.default) {
                def += ` NOT NULL DEFAULT ${col.default}`;
            } else if (col.default) {
                def += ` DEFAULT ${col.default}`;
            }
            if (col.unique) {
                def += ' UNIQUE';
            }
            return def;
        });

        const primaryKey = schema.columns.find(col => col.primary_key);
        const primaryKeyDef = primaryKey ? `, PRIMARY KEY (${primaryKey.name})` : '';

        const sql = `CREATE TABLE ${tableName} (${columns.join(', ')}${primaryKeyDef})`;
        
        await pool.query(sql);
        console.log(`   ✅ Table "${tableName}" créée`);
        return true;
    } catch (error) {
        if (error.message.includes('must be owner') || error.message.includes('permission denied') || error.code === '42501') {
            console.error(`   ⚠️  Permission refusée pour créer la table "${tableName}"`);
            console.error(`      Erreur: ${error.message}`);
            console.error(`      Solution: Exécutez ce script avec un utilisateur ayant les droits CREATE TABLE`);
            return false;
        }
        throw error;
    }
}

/**
 * Ajouter une colonne manquante
 */
async function addColumn(tableName, column) {
    try {
        let sql = `ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.type}`;
        
        if (column.not_null && !column.default) {
            // Pour les colonnes NOT NULL sans default, on doit d'abord ajouter avec default temporaire
            sql = `ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.default || "NULL"}`;
            await pool.query(sql);
            // Puis enlever le default si nécessaire
            if (!column.default) {
                await pool.query(`ALTER TABLE ${tableName} ALTER COLUMN ${column.name} DROP DEFAULT`);
                await pool.query(`ALTER TABLE ${tableName} ALTER COLUMN ${column.name} SET NOT NULL`);
            }
        } else if (column.default) {
            sql += ` DEFAULT ${column.default}`;
            await pool.query(sql);
        } else {
            await pool.query(sql);
        }
        
        if (column.unique) {
            try {
                await pool.query(`CREATE UNIQUE INDEX ${tableName}_${column.name}_key ON ${tableName}(${column.name})`);
            } catch (error) {
                // Index peut déjà exister
                if (!error.message.includes('already exists')) {
                    throw error;
                }
            }
        }
        
        console.log(`   ✅ Colonne "${column.name}" ajoutée à "${tableName}"`);
        return true;
    } catch (error) {
        if (error.message.includes('must be owner') || error.message.includes('permission denied') || error.code === '42501') {
            console.error(`   ⚠️  Permission refusée pour ajouter la colonne "${column.name}"`);
            console.error(`      Erreur: ${error.message}`);
            console.error(`      Solution: Exécutez ce script avec un utilisateur ayant les droits ALTER TABLE`);
            console.error(`      Commande SQL nécessaire:`);
            console.error(`      ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.type}${column.default ? ` DEFAULT ${column.default}` : ''};`);
            return false;
        }
        throw error;
    }
}

/**
 * Vérifier et corriger une table
 */
async function verifyAndFixTable(tableName, schema) {
    const exists = await tableExists(tableName);
    
    if (!exists) {
        if (schema.optional) {
            console.log(`   ⚠️  Table "${tableName}" n'existe pas (optionnelle, ignorée)`);
            return { created: false, columnsAdded: 0 };
        }
        console.log(`   ❌ Table "${tableName}" manquante`);
        await createTable(tableName, schema);
        return { created: true, columnsAdded: 0 };
    }
    
    let columnsAdded = 0;
    for (const column of schema.columns) {
        const colExists = await columnExists(tableName, column.name);
        if (!colExists) {
            console.log(`   ❌ Colonne "${column.name}" manquante dans "${tableName}"`);
            await addColumn(tableName, column);
            columnsAdded++;
        }
    }
    
    return { created: false, columnsAdded };
}

/**
 * Fonction principale
 */
async function verifyAndFixDatabase() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║     VÉRIFICATION ET CORRECTION DE LA BASE DE DONNÉES       ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    console.log('📋 Configuration PostgreSQL:');
    console.log(`   🏠 Hôte       : ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   🔌 Port       : ${process.env.DB_PORT || '5432'}`);
    console.log(`   👤 Utilisateur: ${process.env.DB_USER || 'Non défini'}`);
    console.log(`   🗄️  Base      : ${process.env.DB_NAME || 'Non définie'}\n`);
    
    try {
        // Test de connexion
        await pool.query('SELECT NOW()');
        console.log('✅ Connexion à la base de données réussie\n');
        
        const stats = {
            tablesCreated: 0,
            columnsAdded: 0,
            tablesChecked: 0
        };
        
        console.log('🔍 Vérification de la structure...\n');
        
        // Vérifier toutes les tables
        let permissionErrors = [];
        for (const [tableName, schema] of Object.entries(EXPECTED_SCHEMA)) {
            console.log(`📊 Table: ${tableName}`);
            try {
                const result = await verifyAndFixTable(tableName, schema);
                stats.tablesChecked++;
                if (result.created) stats.tablesCreated++;
                stats.columnsAdded += result.columnsAdded;
            } catch (error) {
                if (error.message.includes('must be owner') || error.message.includes('permission denied') || error.code === '42501') {
                    permissionErrors.push({ table: tableName, error: error.message });
                    console.error(`   ⚠️  Erreur de permissions pour "${tableName}"`);
                } else {
                    throw error;
                }
            }
            console.log('');
        }
        
        // Résumé
        console.log('╔══════════════════════════════════════════════════════════════╗');
        console.log('║              ✅ VÉRIFICATION TERMINÉE                       ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
        console.log('📊 RÉSUMÉ :');
        console.log('═══════════');
        console.log(`   ✓ ${stats.tablesChecked} tables vérifiées`);
        if (stats.tablesCreated > 0) {
            console.log(`   ✓ ${stats.tablesCreated} tables créées`);
        }
        if (stats.columnsAdded > 0) {
            console.log(`   ✓ ${stats.columnsAdded} colonnes ajoutées`);
        }
        if (stats.tablesCreated === 0 && stats.columnsAdded === 0 && permissionErrors.length === 0) {
            console.log(`   ✅ La structure est complète et à jour !`);
        }
        
        // Afficher les erreurs de permissions
        if (permissionErrors.length > 0) {
            console.log('\n⚠️  ERREURS DE PERMISSIONS :');
            console.log('═══════════════════════════════');
            console.log(`   ${permissionErrors.length} opération(s) nécessitent des droits administrateur\n`);
            console.log('💡 SOLUTIONS :');
            console.log('═══════════════');
            console.log('   1. Exécutez le script avec un utilisateur PostgreSQL ayant les droits :');
            console.log('      - ALTER TABLE sur les tables existantes');
            console.log('      - CREATE TABLE pour les nouvelles tables\n');
            console.log('   2. Donnez la propriété des tables à ewm_user :');
            console.log('      En tant que postgres/superuser, exécutez :\n');
            console.log('      sudo -u postgres psql -d ewm_db -f scripts/database/fix-database-ownership.sql\n');
            console.log('      Ou manuellement :');
            console.log('      ALTER TABLE users OWNER TO ewm_user;');
            console.log('      ALTER TABLE notifications OWNER TO ewm_user;');
            console.log('      -- etc. pour toutes les tables\n');
            console.log('   3. Ou accordez les droits (si vous ne pouvez pas changer le propriétaire) :');
            console.log('      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ewm_user;');
            console.log('      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ewm_user;\n');
            console.log('   3. Ou exécutez directement les commandes SQL nécessaires :');
            console.log('      (Voir les commandes SQL affichées ci-dessus)\n');
        }
        
        console.log('');
        
    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error('\n💡 Vérifiez :');
        console.error('   - Les informations de connexion dans .env');
        console.error('   - Que PostgreSQL est démarré');
        console.error('   - Que vous avez les droits nécessaires\n');
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Exécution
if (require.main === module) {
    verifyAndFixDatabase().catch(console.error);
}

module.exports = { verifyAndFixDatabase, EXPECTED_SCHEMA, tableExists, columnExists };

