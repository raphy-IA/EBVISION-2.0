// Script de test pour initialiser la base de données localement
// Usage: node test-init-local.js

// Configuration de test
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'ewm_test_local';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';
process.env.DB_SSL = 'false';

// Importer les modules nécessaires
const { Pool } = require('pg');
const { ensureExtensions } = require('./scripts/database/utils/schema-initializer');
const { runMigrations } = require('./database/migrate');

async function testInit() {
    console.log('\n🧪 TEST D\'INITIALISATION DE LA BASE DE DONNÉES\n');
    console.log('📋 Configuration:');
    console.log(`   🏠 Hôte: ${process.env.DB_HOST}`);
    console.log(`   🔌 Port: ${process.env.DB_PORT}`);
    console.log(`   🗄️  Base: ${process.env.DB_NAME}`);
    console.log(`   👤 User: ${process.env.DB_USER}\n`);

    const pool = new Pool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: 'Information@2025', // Mot de passe PostgreSQL
        ssl: false
    });

    try {
        console.log('📡 Connexion à la base de données...');
        await pool.query('SELECT NOW()');
        console.log('✅ Connexion réussie!\n');

        console.log('🧩 Installation des extensions...');
        await ensureExtensions(pool);
        console.log('✅ Extensions installées!\n');

        console.log('🚀 Exécution des migrations...');
        // Passer la configuration au système de migration
        const { runMigrationsWithConfig } = require('./scripts/database/utils/schema-initializer');
        const config = {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: 'Information@2025'
        };
        await runMigrationsWithConfig(config);
        console.log('✅ Migrations terminées!\n');

        console.log('📊 Vérification des tables créées...');
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        
        console.log(`\n✅ ${result.rows.length} tables créées:`);
        result.rows.forEach((row, index) => {
            console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${row.table_name}`);
        });

        console.log('\n✅ TEST RÉUSSI! La base de données a été initialisée correctement.\n');
        
    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error('\n📋 Détails:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

testInit();

