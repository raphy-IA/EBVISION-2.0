const { Pool } = require('pg');
const config = require('../config.production.js');

async function testConnection() {
  const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    password: config.database.password,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  
  try {
    console.log('🔗 Test de connexion à la base de données locale...');
    console.log(`   Host: ${config.database.host}`);
    console.log(`   Port: ${config.database.port}`);
    console.log(`   Database: ${config.database.database}`);
    console.log(`   User: ${config.database.user}`);
    
    const client = await pool.connect();
    console.log('✅ Connexion réussie !');
    
    // Test simple
    const result = await client.query('SELECT COUNT(*) as count FROM opportunity_types');
    console.log(`📊 Types d'opportunité trouvés: ${result.rows[0].count}`);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
    console.error('   Détails:', error);
  } finally {
    await pool.end();
  }
}

testConnection();







