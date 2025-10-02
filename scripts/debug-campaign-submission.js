const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Script pour diagnostiquer pourquoi un responsable ne peut pas soumettre une campagne
async function debugCampaignSubmission() {
  console.log('🔍 Diagnostic de la soumission de campagne...\n');
  
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
    
    // ID de la campagne et utilisateur depuis les logs
    const campaignId = '7cf7b23c-26e9-43c6-b847-d9f1574b2675';
    const userName = 'Songo Robert'; // D'après les logs
    
    console.log('📋 INFORMATIONS DE LA CAMPAGNE:');
    console.log('===============================');
    
    // 1. Récupérer les informations de la campagne
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
        u.name as creator_name,
        bu.name as bu_name,
        d.name as division_name
      FROM prospecting_campaigns pc
      LEFT JOIN users u ON pc.created_by = u.id
      LEFT JOIN business_units bu ON pc.business_unit_id = bu.id
      LEFT JOIN divisions d ON pc.division_id = d.id
      WHERE pc.id = $1
    `;
    
    const campaignResult = await client.query(campaignQuery, [campaignId]);
    
    if (campaignResult.rows.length === 0) {
      console.log('❌ Campagne non trouvée');
      return;
    }
    
    const campaign = campaignResult.rows[0];
    console.log(`   ID: ${campaign.id}`);
    console.log(`   Nom: ${campaign.name}`);
    console.log(`   Créé par: ${campaign.creator_name} (${campaign.creator_login})`);
    console.log(`   ID créateur: ${campaign.created_by}`);
    console.log(`   Business Unit: ${campaign.bu_name} (ID: ${campaign.business_unit_id})`);
    console.log(`   Division: ${campaign.division_name} (ID: ${campaign.division_id})`);
    console.log(`   Statut: ${campaign.validation_statut || campaign.status}\n`);
    
    // 2. Récupérer les informations de l'utilisateur Songo Robert
    console.log('👤 INFORMATIONS DE L\'UTILISATEUR:');
    console.log('==================================');
    
    const userQuery = `
      SELECT 
        u.id,
        u.login,
        u.name,
        u.role,
        u.collaborateur_id,
        c.nom,
        c.prenom,
        c.business_unit_id as collab_bu_id,
        c.division_id as collab_div_id
      FROM users u
      LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
      WHERE u.name = $1
    `;
    
    const userResult = await client.query(userQuery, [userName]);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Utilisateur non trouvé');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`   ID: ${user.id}`);
    console.log(`   Login: ${user.login}`);
    console.log(`   Nom: ${user.name}`);
    console.log(`   Rôle: ${user.role}`);
    console.log(`   Collaborateur ID: ${user.collaborateur_id}`);
    console.log(`   Nom collaborateur: ${user.prenom} ${user.nom}`);
    console.log(`   BU du collaborateur: ${user.collab_bu_id}`);
    console.log(`   Division du collaborateur: ${user.collab_div_id}\n`);
    
    // 3. Vérifier si l'utilisateur est le créateur
    console.log('🔍 VÉRIFICATION CRÉATEUR:');
    console.log('=========================');
    const isCreator = campaign.created_by === user.id;
    console.log(`   Utilisateur est créateur: ${isCreator ? '✅ OUI' : '❌ NON'}`);
    if (!isCreator) {
      console.log(`   ID créateur: ${campaign.created_by}`);
      console.log(`   ID utilisateur: ${user.id}`);
    }
    console.log('');
    
    // 4. Vérifier les managers de la Business Unit
    console.log('🏢 VÉRIFICATION MANAGERS BUSINESS UNIT:');
    console.log('=======================================');
    
    if (campaign.business_unit_id) {
      const buManagersQuery = `
        SELECT 
          m.id,
          m.business_unit_id,
          m.principal_id,
          m.adjoint_id,
          c1.nom as principal_nom,
          c1.prenom as principal_prenom,
          c2.nom as adjoint_nom,
          c2.prenom as adjoint_prenom
        FROM managers m
        LEFT JOIN collaborateurs c1 ON m.principal_id = c1.id
        LEFT JOIN collaborateurs c2 ON m.adjoint_id = c2.id
        WHERE m.business_unit_id = $1
      `;
      
      const buManagersResult = await client.query(buManagersQuery, [campaign.business_unit_id]);
      
      if (buManagersResult.rows.length > 0) {
        const buManager = buManagersResult.rows[0];
        console.log(`   Business Unit: ${campaign.bu_name}`);
        console.log(`   Manager principal: ${buManager.principal_prenom} ${buManager.principal_nom} (ID: ${buManager.principal_id})`);
        console.log(`   Manager adjoint: ${buManager.adjoint_prenom} ${buManager.adjoint_nom} (ID: ${buManager.adjoint_id})`);
        
        const isBUManager = user.collaborateur_id === buManager.principal_id || user.collaborateur_id === buManager.adjoint_id;
        console.log(`   Utilisateur est manager BU: ${isBUManager ? '✅ OUI' : '❌ NON'}`);
        if (isBUManager) {
          console.log(`   Type: ${user.collaborateur_id === buManager.principal_id ? 'Principal' : 'Adjoint'}`);
        }
      } else {
        console.log('   ❌ Aucun manager trouvé pour cette Business Unit');
      }
    } else {
      console.log('   ❌ Aucune Business Unit associée à la campagne');
    }
    console.log('');
    
    // 5. Vérifier les managers de la Division
    console.log('🏛️ VÉRIFICATION MANAGERS DIVISION:');
    console.log('===================================');
    
    if (campaign.division_id) {
      const divManagersQuery = `
        SELECT 
          m.id,
          m.division_id,
          m.principal_id,
          m.adjoint_id,
          c1.nom as principal_nom,
          c1.prenom as principal_prenom,
          c2.nom as adjoint_nom,
          c2.prenom as adjoint_prenom
        FROM managers m
        LEFT JOIN collaborateurs c1 ON m.principal_id = c1.id
        LEFT JOIN collaborateurs c2 ON m.adjoint_id = c2.id
        WHERE m.division_id = $1
      `;
      
      const divManagersResult = await client.query(divManagersQuery, [campaign.division_id]);
      
      if (divManagersResult.rows.length > 0) {
        const divManager = divManagersResult.rows[0];
        console.log(`   Division: ${campaign.division_name}`);
        console.log(`   Manager principal: ${divManager.principal_prenom} ${divManager.principal_nom} (ID: ${divManager.principal_id})`);
        console.log(`   Manager adjoint: ${divManager.adjoint_prenom} ${divManager.adjoint_nom} (ID: ${divManager.adjoint_id})`);
        
        const isDivManager = user.collaborateur_id === divManager.principal_id || user.collaborateur_id === divManager.adjoint_id;
        console.log(`   Utilisateur est manager Division: ${isDivManager ? '✅ OUI' : '❌ NON'}`);
        if (isDivManager) {
          console.log(`   Type: ${user.collaborateur_id === divManager.principal_id ? 'Principal' : 'Adjoint'}`);
        }
      } else {
        console.log('   ❌ Aucun manager trouvé pour cette Division');
      }
    } else {
      console.log('   ❌ Aucune Division associée à la campagne');
    }
    console.log('');
    
    // 6. Vérifier la correspondance des Business Units
    console.log('🔗 VÉRIFICATION CORRESPONDANCE BU:');
    console.log('===================================');
    
    if (campaign.business_unit_id && user.collab_bu_id) {
      const buMatch = campaign.business_unit_id === user.collab_bu_id;
      console.log(`   BU de la campagne: ${campaign.business_unit_id}`);
      console.log(`   BU de l'utilisateur: ${user.collab_bu_id}`);
      console.log(`   Correspondance BU: ${buMatch ? '✅ OUI' : '❌ NON'}`);
    } else {
      console.log('   ⚠️ Impossible de vérifier la correspondance BU');
    }
    console.log('');
    
    // 7. Résumé des autorisations
    console.log('📊 RÉSUMÉ DES AUTORISATIONS:');
    console.log('=============================');
    
    const isBUManager = campaign.business_unit_id && user.collaborateur_id && 
      await checkIfUserIsBUManager(client, campaign.business_unit_id, user.collaborateur_id);
    
    const isDivManager = campaign.division_id && user.collaborateur_id && 
      await checkIfUserIsDivManager(client, campaign.division_id, user.collaborateur_id);
    
    const isAuthorized = isCreator || isBUManager || isDivManager;
    
    console.log(`   ✅ Créateur: ${isCreator ? 'OUI' : 'NON'}`);
    console.log(`   ✅ Manager BU: ${isBUManager ? 'OUI' : 'NON'}`);
    console.log(`   ✅ Manager Division: ${isDivManager ? 'OUI' : 'NON'}`);
    console.log(`   🎯 AUTORISÉ: ${isAuthorized ? '✅ OUI' : '❌ NON'}`);
    console.log('');
    
    // 8. Recommandations
    console.log('💡 RECOMMANDATIONS:');
    console.log('===================');
    
    if (!isAuthorized) {
      console.log('❌ L\'utilisateur n\'est pas autorisé à soumettre cette campagne.');
      console.log('');
      console.log('🔧 Solutions possibles:');
      console.log('   1. Vérifier que l\'utilisateur est bien le créateur de la campagne');
      console.log('   2. Vérifier que l\'utilisateur est manager de la BU/Division de la campagne');
      console.log('   3. Vérifier que le collaborateur_id de l\'utilisateur est correct');
      console.log('   4. Vérifier que les managers sont bien configurés dans la base');
      console.log('   5. Vérifier que la campagne a bien une BU/Division associée');
    } else {
      console.log('✅ L\'utilisateur devrait être autorisé à soumettre la campagne.');
      console.log('   Vérifiez les logs du serveur pour plus de détails.');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error.message);
  } finally {
    if (client) client.release();
    await pool.end();
    console.log('\n✅ Diagnostic terminé !');
  }
}

// Fonctions utilitaires
async function checkIfUserIsBUManager(client, buId, collaborateurId) {
  const query = `
    SELECT COUNT(*) as count 
    FROM managers 
    WHERE business_unit_id = $1 AND (principal_id = $2 OR adjoint_id = $2)
  `;
  const result = await client.query(query, [buId, collaborateurId]);
  return parseInt(result.rows[0].count) > 0;
}

async function checkIfUserIsDivManager(client, divId, collaborateurId) {
  const query = `
    SELECT COUNT(*) as count 
    FROM managers 
    WHERE division_id = $1 AND (principal_id = $2 OR adjoint_id = $2)
  `;
  const result = await client.query(query, [divId, collaborateurId]);
  return parseInt(result.rows[0].count) > 0;
}

// Exécuter le script
if (require.main === module) {
  debugCampaignSubmission();
}

module.exports = { debugCampaignSubmission };



