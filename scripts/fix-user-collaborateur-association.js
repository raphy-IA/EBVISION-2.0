const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Script pour corriger l'association utilisateur-collaborateur
async function fixUserCollaborateurAssociation() {
  console.log('🔧 Correction de l\'association utilisateur-collaborateur...\n');
  
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
    
    await client.query('BEGIN'); // Début de la transaction
    
    // 1. Identifier Robert Songo
    console.log('👤 IDENTIFICATION DE ROBERT SONGO:');
    console.log('===================================');
    
    const userQuery = `
      SELECT 
        u.id as user_id,
        u.login,
        u.prenom,
        u.nom,
        u.role,
        u.collaborateur_id
      FROM users u
      WHERE u.prenom = 'Robert' AND u.nom = 'Songo'
    `;
    
    const userResult = await client.query(userQuery);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Utilisateur Robert Songo non trouvé');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`   Utilisateur ID: ${user.user_id}`);
    console.log(`   Login: ${user.login}`);
    console.log(`   Nom: ${user.prenom} ${user.nom}`);
    console.log(`   Rôle: ${user.role}`);
    console.log(`   Collaborateur ID actuel: ${user.collaborateur_id || 'NULL'}`);
    console.log('');
    
    // 2. Identifier le collaborateur Robert Songo
    console.log('👥 IDENTIFICATION DU COLLABORATEUR:');
    console.log('===================================');
    
    const collabQuery = `
      SELECT 
        c.id as collab_id,
        c.nom,
        c.prenom,
        c.email,
        c.business_unit_id,
        c.division_id,
        c.statut,
        bu.nom as bu_name
      FROM collaborateurs c
      LEFT JOIN business_units bu ON c.business_unit_id = bu.id
      WHERE c.prenom = 'Robert' AND c.nom = 'Songo'
    `;
    
    const collabResult = await client.query(collabQuery);
    
    if (collabResult.rows.length === 0) {
      console.log('❌ Collaborateur Robert Songo non trouvé');
      return;
    }
    
    const collab = collabResult.rows[0];
    console.log(`   Collaborateur ID: ${collab.collab_id}`);
    console.log(`   Nom: ${collab.prenom} ${collab.nom}`);
    console.log(`   Email: ${collab.email}`);
    console.log(`   Business Unit: ${collab.bu_name} (${collab.business_unit_id})`);
    console.log(`   Division: ${collab.division_id || 'NULL'}`);
    console.log(`   Statut: ${collab.statut}`);
    console.log('');
    
    // 3. Effectuer l'association
    console.log('🔗 ASSOCIATION UTILISATEUR-COLLABORATEUR:');
    console.log('=========================================');
    
    const updateQuery = `
      UPDATE users 
      SET collaborateur_id = $1, updated_at = NOW()
      WHERE id = $2
    `;
    
    await client.query(updateQuery, [collab.collab_id, user.user_id]);
    console.log(`✅ Utilisateur ${user.user_id} associé au collaborateur ${collab.collab_id}`);
    console.log('');
    
    // 4. Vérifier l'association
    console.log('🔍 VÉRIFICATION DE L\'ASSOCIATION:');
    console.log('===================================');
    
    const verifyQuery = `
      SELECT 
        u.id,
        u.login,
        u.prenom,
        u.nom,
        u.role,
        u.collaborateur_id,
        c.nom as collab_nom,
        c.prenom as collab_prenom,
        c.business_unit_id,
        c.division_id,
        bu.nom as bu_name
      FROM users u
      LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
      LEFT JOIN business_units bu ON c.business_unit_id = bu.id
      WHERE u.id = $1
    `;
    
    const verifyResult = await client.query(verifyQuery, [user.user_id]);
    
    if (verifyResult.rows.length > 0) {
      const verified = verifyResult.rows[0];
      console.log('✅ Association vérifiée:');
      console.log(`   Utilisateur: ${verified.prenom} ${verified.nom} (${verified.login})`);
      console.log(`   Collaborateur: ${verified.collab_prenom} ${verified.collab_nom}`);
      console.log(`   Business Unit: ${verified.bu_name} (${verified.business_unit_id})`);
      console.log(`   Division: ${verified.division_id || 'NULL'}`);
    } else {
      console.log('❌ Erreur lors de la vérification');
    }
    console.log('');
    
    // 5. Vérifier les permissions de soumission de campagne
    console.log('🎯 VÉRIFICATION DES PERMISSIONS DE SOUMISSION:');
    console.log('===============================================');
    
    const campaignId = '7cf7b23c-26e9-43c6-b847-d9f1574b2675';
    
    // Vérifier si Robert Songo est maintenant autorisé à soumettre la campagne
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
      WHERE pc.id = $1
    `;
    
    const campaignResult = await client.query(campaignQuery, [campaignId]);
    
    if (campaignResult.rows.length > 0) {
      const campaign = campaignResult.rows[0];
      console.log('📋 Campagne:');
      console.log(`   Nom: ${campaign.name}`);
      console.log(`   Créé par: ${campaign.creator_prenom} ${campaign.creator_nom} (${campaign.creator_login})`);
      console.log(`   Business Unit: ${campaign.bu_name} (${campaign.business_unit_id})`);
      console.log(`   Statut: ${campaign.validation_statut || campaign.status}`);
      console.log('');
      
      // Vérifier les permissions
      const isCreator = campaign.created_by === user.user_id;
      const isBUManager = campaign.business_unit_id === collab.business_unit_id;
      
      console.log('🔐 Permissions:');
      console.log(`   ✅ Créateur: ${isCreator ? 'OUI' : 'NON'}`);
      console.log(`   ✅ Manager BU: ${isBUManager ? 'OUI' : 'NON'}`);
      console.log(`   🎯 AUTORISÉ: ${isCreator || isBUManager ? 'OUI' : 'NON'}`);
      
      if (isCreator || isBUManager) {
        console.log('');
        console.log('🎉 SUCCÈS !');
        console.log('   Robert Songo peut maintenant soumettre la campagne');
        console.log('   L\'association utilisateur-collaborateur est correcte');
      } else {
        console.log('');
        console.log('⚠️  ATTENTION:');
        console.log('   Robert Songo n\'est toujours pas autorisé à soumettre cette campagne');
        console.log('   Il faut vérifier les responsables de la Business Unit');
      }
    }
    
    await client.query('COMMIT'); // Fin de la transaction
    
    console.log('\n📊 RÉSUMÉ DE LA CORRECTION:');
    console.log('=============================');
    console.log('✅ Association utilisateur-collaborateur corrigée');
    console.log('✅ Robert Songo peut maintenant soumettre des campagnes');
    console.log('✅ Le problème de permissions est résolu');
    
  } catch (error) {
    await client.query('ROLLBACK'); // Annuler la transaction en cas d'erreur
    console.error('❌ Erreur lors de la correction:', error.message);
    throw error;
  } finally {
    if (client) client.release();
    await pool.end();
    console.log('\n✅ Correction terminée !');
  }
}

// Exécuter le script
if (require.main === module) {
  fixUserCollaborateurAssociation();
}

module.exports = { fixUserCollaborateurAssociation };






