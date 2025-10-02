const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Script pour vérifier la structure de la table users
async function checkUsersTableStructure() {
  console.log('🔍 Vérification de la structure de la table users...\n');
  
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
    
    // Vérifier la structure de la table users
    const structureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;
    
    const structureResult = await client.query(structureQuery);
    
    console.log('📋 STRUCTURE DE LA TABLE USERS:');
    console.log('===============================');
    structureResult.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    console.log('');
    
    // Vérifier les utilisateurs avec "Songo" dans le nom
    const usersQuery = `
      SELECT id, login, name, first_name, last_name, role, collaborateur_id
      FROM users
      WHERE name LIKE '%Songo%' OR first_name LIKE '%Songo%' OR last_name LIKE '%Songo%'
    `;
    
    const usersResult = await client.query(usersQuery);
    
    console.log('👤 UTILISATEURS TROUVÉS:');
    console.log('========================');
    if (usersResult.rows.length > 0) {
      usersResult.rows.forEach(user => {
        console.log(`   ID: ${user.id}`);
        console.log(`   Login: ${user.login}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   First Name: ${user.first_name}`);
        console.log(`   Last Name: ${user.last_name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Collaborateur ID: ${user.collaborateur_id}`);
        console.log('   ---');
      });
    } else {
      console.log('   ❌ Aucun utilisateur trouvé avec "Songo"');
    }
    console.log('');
    
    // Vérifier la campagne
    const campaignQuery = `
      SELECT id, name, created_by, business_unit_id, division_id, validation_statut, status
      FROM prospecting_campaigns
      WHERE id = '7cf7b23c-26e9-43c6-b847-d9f1574b2675'
    `;
    
    const campaignResult = await client.query(campaignQuery);
    
    console.log('📋 CAMPAGNE:');
    console.log('============');
    if (campaignResult.rows.length > 0) {
      const campaign = campaignResult.rows[0];
      console.log(`   ID: ${campaign.id}`);
      console.log(`   Nom: ${campaign.name}`);
      console.log(`   Créé par: ${campaign.created_by}`);
      console.log(`   Business Unit ID: ${campaign.business_unit_id}`);
      console.log(`   Division ID: ${campaign.division_id}`);
      console.log(`   Statut: ${campaign.validation_statut || campaign.status}`);
    } else {
      console.log('   ❌ Campagne non trouvée');
    }
    
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
  checkUsersTableStructure();
}

module.exports = { checkUsersTableStructure };


