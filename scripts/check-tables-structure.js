const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Script pour vérifier la structure des tables
async function checkTablesStructure() {
  console.log('🔍 Vérification de la structure des tables...\n');
  
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  };
  
  const pool = new Pool(dbConfig);
  let client;
  
  try {
    client = await pool.connect();
    console.log('✅ Connexion à la base de données réussie\n');
    
    // Vérifier la structure de la table business_units
    const buStructureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'business_units'
      ORDER BY ordinal_position
    `;
    
    const buStructureResult = await client.query(buStructureQuery);
    
    console.log('📋 STRUCTURE DE LA TABLE BUSINESS_UNITS:');
    console.log('=========================================');
    buStructureResult.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    console.log('');
    
    // Vérifier la structure de la table divisions
    const divStructureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'divisions'
      ORDER BY ordinal_position
    `;
    
    const divStructureResult = await client.query(divStructureQuery);
    
    console.log('📋 STRUCTURE DE LA TABLE DIVISIONS:');
    console.log('===================================');
    divStructureResult.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    console.log('');
    
    // Vérifier la structure de la table managers
    const managersStructureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'managers'
      ORDER BY ordinal_position
    `;
    
    const managersStructureResult = await client.query(managersStructureQuery);
    
    console.log('📋 STRUCTURE DE LA TABLE MANAGERS:');
    console.log('==================================');
    managersStructureResult.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    console.log('');
    
    // Vérifier la structure de la table collaborateurs
    const collabStructureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'collaborateurs'
      ORDER BY ordinal_position
    `;
    
    const collabStructureResult = await client.query(collabStructureQuery);
    
    console.log('📋 STRUCTURE DE LA TABLE COLLABORATEURS:');
    console.log('========================================');
    collabStructureResult.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    console.log('');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    if (client) client.release();
    await pool.end();
    console.log('\n✅ Vérification terminée !');
  }
}

// Exécuter le script
if (require.main === module) {
  checkTablesStructure();
}

module.exports = { checkTablesStructure };





