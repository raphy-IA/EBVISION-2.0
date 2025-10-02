const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Script pour trouver l'utilisateur Songo
async function findUserSongo() {
  console.log('🔍 Recherche de l\'utilisateur Songo...\n');
  
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
    
    // Rechercher tous les utilisateurs avec "Songo" dans le nom
    const userQuery = `
      SELECT 
        u.id,
        u.login,
        u.prenom,
        u.nom,
        u.role,
        u.collaborateur_id,
        c.nom as collab_nom,
        c.prenom as collab_prenom,
        c.business_unit_id as collab_bu_id,
        c.division_id as collab_div_id
      FROM users u
      LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
      WHERE u.prenom ILIKE '%songo%' OR u.nom ILIKE '%songo%' OR u.login ILIKE '%songo%'
    `;
    
    const userResult = await client.query(userQuery);
    
    console.log('👤 UTILISATEURS TROUVÉS:');
    console.log('========================');
    if (userResult.rows.length > 0) {
      userResult.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ID: ${user.id}`);
        console.log(`      Login: ${user.login}`);
        console.log(`      Nom: ${user.prenom} ${user.nom}`);
        console.log(`      Rôle: ${user.role}`);
        console.log(`      Collaborateur ID: ${user.collaborateur_id}`);
        console.log(`      Nom collaborateur: ${user.collab_prenom} ${user.collab_nom}`);
        console.log(`      BU du collaborateur: ${user.collab_bu_id}`);
        console.log(`      Division du collaborateur: ${user.collab_div_id}`);
        console.log('      ---');
      });
    } else {
      console.log('   ❌ Aucun utilisateur trouvé avec "Songo"');
    }
    console.log('');
    
    // Rechercher tous les utilisateurs avec le rôle MANAGER
    const managerQuery = `
      SELECT 
        u.id,
        u.login,
        u.prenom,
        u.nom,
        u.role,
        u.collaborateur_id,
        c.nom as collab_nom,
        c.prenom as collab_prenom,
        c.business_unit_id as collab_bu_id,
        c.division_id as collab_div_id
      FROM users u
      LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
      WHERE u.role = 'MANAGER'
      ORDER BY u.prenom, u.nom
    `;
    
    const managerResult = await client.query(managerQuery);
    
    console.log('👥 TOUS LES MANAGERS:');
    console.log('=====================');
    if (managerResult.rows.length > 0) {
      managerResult.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.prenom} ${user.nom} (${user.login}) - ${user.role}`);
        console.log(`      Collaborateur ID: ${user.collaborateur_id}`);
        console.log(`      BU: ${user.collab_bu_id}`);
        console.log(`      Division: ${user.collab_div_id}`);
        console.log('      ---');
      });
    } else {
      console.log('   ❌ Aucun manager trouvé');
    }
    console.log('');
    
    // Vérifier la campagne
    const campaignQuery = `
      SELECT 
        pc.id,
        pc.name,
        pc.created_by,
        pc.business_unit_id,
        pc.division_id,
        pc.validation_statut,
        pc.status,
        u.login as creator_login,
        u.prenom as creator_prenom,
        u.nom as creator_nom,
        bu.nom as bu_name
      FROM prospecting_campaigns pc
      LEFT JOIN users u ON pc.created_by = u.id
      LEFT JOIN business_units bu ON pc.business_unit_id = bu.id
      WHERE pc.id = '7cf7b23c-26e9-43c6-b847-d9f1574b2675'
    `;
    
    const campaignResult = await client.query(campaignQuery);
    
    console.log('📋 CAMPAGNE:');
    console.log('============');
    if (campaignResult.rows.length > 0) {
      const campaign = campaignResult.rows[0];
      console.log(`   ID: ${campaign.id}`);
      console.log(`   Nom: ${campaign.name}`);
      console.log(`   Créé par: ${campaign.creator_prenom} ${campaign.creator_nom} (${campaign.creator_login})`);
      console.log(`   ID créateur: ${campaign.created_by}`);
      console.log(`   Business Unit: ${campaign.bu_name} (ID: ${campaign.business_unit_id})`);
      console.log(`   Division: ${campaign.division_id}`);
      console.log(`   Statut: ${campaign.validation_statut || campaign.status}`);
    } else {
      console.log('   ❌ Campagne non trouvée');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    if (client) client.release();
    await pool.end();
    console.log('\n✅ Recherche terminée !');
  }
}

// Exécuter le script
if (require.main === module) {
  findUserSongo();
}

module.exports = { findUserSongo };


