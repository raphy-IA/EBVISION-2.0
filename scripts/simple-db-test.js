// Charger les variables d'environnement
require('dotenv').config();

const { Pool } = require('pg');

console.log('🔍 Test simple de connexion à la base de données...\n');

// Afficher les variables d'environnement
console.log('📋 Variables d\'environnement :');
console.log(`   DB_HOST: ${process.env.DB_HOST || 'non défini'}`);
console.log(`   DB_PORT: ${process.env.DB_PORT || 'non défini'}`);
console.log(`   DB_NAME: ${process.env.DB_NAME || 'non défini'}`);
console.log(`   DB_USER: ${process.env.DB_USER || 'non défini'}`);
console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '***' : 'non défini'}\n`);

// Configuration de base
const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'ebpadfbq_eb_vision_2_0',
    user: process.env.DB_USER || 'ebpadfbq_eb_admin20',
    password: process.env.DB_PASSWORD || '87ifet-Z)&',
    ssl: false,
    connectionTimeoutMillis: 5000
};

console.log('🔌 Tentative de connexion...');
console.log(`   Host: ${config.host}`);
console.log(`   Port: ${config.port}`);
console.log(`   Database: ${config.database}`);
console.log(`   User: ${config.user}\n`);

const pool = new Pool(config);

pool.connect()
    .then(client => {
        console.log('✅ Connexion réussie !');
        
        return client.query('SELECT NOW() as current_time, current_database() as db_name, current_user as user');
    })
    .then(result => {
        console.log(`   Heure: ${result.rows[0].current_time}`);
        console.log(`   Base de données: ${result.rows[0].db_name}`);
        console.log(`   Utilisateur: ${result.rows[0].user}`);
        
        return pool.end();
    })
    .catch(error => {
        console.error('❌ Erreur de connexion:');
        console.error(`   Message: ${error.message}`);
        console.error(`   Code: ${error.code}`);
        
        if (error.code === '28000') {
            console.log('\n💡 Erreur d\'authentification PostgreSQL');
            console.log('   Solutions possibles :');
            console.log('   1. Vérifiez le nom d\'utilisateur et mot de passe');
            console.log('   2. Vérifiez que l\'utilisateur a accès à cette base de données');
            console.log('   3. Vérifiez la configuration pg_hba.conf');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 PostgreSQL n\'est pas accessible');
            console.log('   Solutions possibles :');
            console.log('   1. Vérifiez que PostgreSQL est démarré');
            console.log('   2. Vérifiez l\'adresse et le port');
        }
        
        return pool.end();
    });








