// Charger les variables d'environnement depuis .env
require('dotenv').config();

const { Pool } = require('pg');

async function testDatabaseConnection() {
    console.log('🔍 Test de connexion à la base de données...\n');
    
    // Configuration de la base de données avec les variables d'environnement
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'ebpadfbq_eb_vision_2_0',
        user: process.env.DB_USER || 'ebpadfbq_eb_admin20',
        password: process.env.DB_PASSWORD || '87ifet-Z)&',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl: false,
        family: 4 // Forcer IPv4
    });

    try {
        console.log('📋 Configuration utilisée :');
        console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
        console.log(`   Port: ${process.env.DB_PORT || 5432}`);
        console.log(`   Database: ${process.env.DB_NAME || 'ebpadfbq_eb_vision_2_0'}`);
        console.log(`   User: ${process.env.DB_USER || 'ebpadfbq_eb_admin20'}`);
        console.log(`   SSL: false`);
        console.log(`   Family: 4\n`);

        // Test de connexion
        console.log('🔌 Test de connexion...');
        const client = await pool.connect();
        
        const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
        console.log('✅ Connexion réussie !');
        console.log(`   Heure actuelle: ${result.rows[0].current_time}`);
        console.log(`   Version PostgreSQL: ${result.rows[0].pg_version.split(' ')[0]}`);
        
        client.release();
        
        // Test des tables
        console.log('\n📊 Vérification des tables...');
        const tables = ['users', 'business_units', 'roles', 'permissions'];
        
        for (const table of tables) {
            try {
                const tableResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`   ✅ ${table}: ${tableResult.rows[0].count} enregistrements`);
            } catch (error) {
                console.log(`   ❌ ${table}: ${error.message}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur de connexion:', error.message);
        console.error('   Code:', error.code);
        console.error('   Détail:', error.detail);
        
        // Suggestions de résolution
        console.log('\n💡 Suggestions de résolution :');
        console.log('   1. Vérifiez que PostgreSQL est démarré');
        console.log('   2. Vérifiez les informations de connexion dans .env');
        console.log('   3. Vérifiez que l\'utilisateur a les permissions');
        console.log('   4. Essayez de vous connecter manuellement :');
        console.log(`      psql -h ${process.env.DB_HOST || 'localhost'} -p ${process.env.DB_PORT || 5432} -U ${process.env.DB_USER || 'ebpadfbq_eb_admin20'} -d ${process.env.DB_NAME || 'ebpadfbq_eb_vision_2_0'}`);
        
    } finally {
        await pool.end();
    }
}

testDatabaseConnection();
