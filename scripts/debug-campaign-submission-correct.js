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
        u.prenom as creator_prenom,
        u.nom as creator_nom,
        bu.nom as bu_name,
        d.nom as division_name
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
    console.log(`   Créé par: ${campaign.creator_prenom} ${campaign.creator_nom} (${campaign.creator_login})`);
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
      WHERE u.prenom = 'Songo' AND u.nom = 'Robert'
    `;
    
    const userResult = await client.query(userQuery);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Utilisateur non trouvé');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`   ID: ${user.id}`);
    console.log(`   Login: ${user.login}`);
    console.log(`   Nom: ${user.prenom} ${user.nom}`);
    console.log(`   Rôle: ${user.role}`);
    console.log(`   Collaborateur ID: ${user.collaborateur_id}`);
    console.log(`   Nom collaborateur: ${user.collab_prenom} ${user.collab_nom}`);
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
    
    // 4. Vérifier les responsables de la Business Unit
    console.log('🏢 VÉRIFICATION RESPONSABLES BUSINESS UNIT:');
    console.log('===========================================');
    
    if (campaign.business_unit_id) {
      const buQuery = `
        SELECT 
          bu.id,
          bu.nom,
          bu.responsable_principal_id,
          bu.responsable_adjoint_id,
          c1.nom as principal_nom,
          c1.prenom as principal_prenom,
          c2.nom as adjoint_nom,
          c2.prenom as adjoint_prenom
        FROM business_units bu
        LEFT JOIN collaborateurs c1 ON bu.responsable_principal_id = c1.id
        LEFT JOIN collaborateurs c2 ON bu.responsable_adjoint_id = c2.id
        WHERE bu.id = $1
      `;
      
      const buResult = await client.query(buQuery, [campaign.business_unit_id]);
      
      if (buResult.rows.length > 0) {
        const bu = buResult.rows[0];
        console.log(`   Business Unit: ${bu.nom}`);
        console.log(`   Responsable principal: ${bu.principal_prenom} ${bu.principal_nom} (ID: ${bu.responsable_principal_id})`);
        console.log(`   Responsable adjoint: ${bu.adjoint_prenom} ${bu.adjoint_nom} (ID: ${bu.responsable_adjoint_id})`);
        
        const isBUManager = user.collaborateur_id === bu.responsable_principal_id || user.collaborateur_id === bu.responsable_adjoint_id;
        console.log(`   Utilisateur est responsable BU: ${isBUManager ? '✅ OUI' : '❌ NON'}`);
        if (isBUManager) {
          console.log(`   Type: ${user.collaborateur_id === bu.responsable_principal_id ? 'Principal' : 'Adjoint'}`);
        }
      } else {
        console.log('   ❌ Business Unit non trouvée');
      }
    } else {
      console.log('   ❌ Aucune Business Unit associée à la campagne');
    }
    console.log('');
    
    // 5. Vérifier les responsables de la Division
    console.log('🏛️ VÉRIFICATION RESPONSABLES DIVISION:');
    console.log('======================================');
    
    if (campaign.division_id) {
      const divQuery = `
        SELECT 
          d.id,
          d.nom,
          d.responsable_principal_id,
          d.responsable_adjoint_id,
          c1.nom as principal_nom,
          c1.prenom as principal_prenom,
          c2.nom as adjoint_nom,
          c2.prenom as adjoint_prenom
        FROM divisions d
        LEFT JOIN collaborateurs c1 ON d.responsable_principal_id = c1.id
        LEFT JOIN collaborateurs c2 ON d.responsable_adjoint_id = c2.id
        WHERE d.id = $1
      `;
      
      const divResult = await client.query(divQuery, [campaign.division_id]);
      
      if (divResult.rows.length > 0) {
        const div = divResult.rows[0];
        console.log(`   Division: ${div.nom}`);
        console.log(`   Responsable principal: ${div.principal_prenom} ${div.principal_nom} (ID: ${div.responsable_principal_id})`);
        console.log(`   Responsable adjoint: ${div.adjoint_prenom} ${div.adjoint_nom} (ID: ${div.responsable_adjoint_id})`);
        
        const isDivManager = user.collaborateur_id === div.responsable_principal_id || user.collaborateur_id === div.responsable_adjoint_id;
        console.log(`   Utilisateur est responsable Division: ${isDivManager ? '✅ OUI' : '❌ NON'}`);
        if (isDivManager) {
          console.log(`   Type: ${user.collaborateur_id === div.responsable_principal_id ? 'Principal' : 'Adjoint'}`);
        }
      } else {
        console.log('   ❌ Division non trouvée');
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
    console.log(`   ✅ Responsable BU: ${isBUManager ? 'OUI' : 'NON'}`);
    console.log(`   ✅ Responsable Division: ${isDivManager ? 'OUI' : 'NON'}`);
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
      console.log('   2. Vérifier que l\'utilisateur est responsable de la BU/Division de la campagne');
      console.log('   3. Vérifier que le collaborateur_id de l\'utilisateur est correct');
      console.log('   4. Vérifier que les responsables sont bien configurés dans la base');
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
    FROM business_units 
    WHERE id = $1 AND (responsable_principal_id = $2 OR responsable_adjoint_id = $2)
  `;
  const result = await client.query(query, [buId, collaborateurId]);
  return parseInt(result.rows[0].count) > 0;
}

async function checkIfUserIsDivManager(client, divId, collaborateurId) {
  const query = `
    SELECT COUNT(*) as count 
    FROM divisions 
    WHERE id = $1 AND (responsable_principal_id = $2 OR responsable_adjoint_id = $2)
  `;
  const result = await client.query(query, [divId, collaborateurId]);
  return parseInt(result.rows[0].count) > 0;
}

// Exécuter le script
if (require.main === module) {
  debugCampaignSubmission();
}

module.exports = { debugCampaignSubmission };






