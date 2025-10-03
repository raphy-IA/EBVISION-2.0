const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Script de diagnostic final
async function finalDiagnosis() {
  console.log('🔍 DIAGNOSTIC FINAL - Pourquoi Robert Songo ne peut pas soumettre la campagne\n');
  
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
    
    const campaignId = '7cf7b23c-26e9-43c6-b847-d9f1574b2675';
    const userId = 'eddd85a9-92d9-4861-89ed-9cf0733240ff'; // Robert Songo
    
    console.log('📋 RÉSUMÉ DE LA SITUATION:');
    console.log('===========================');
    console.log('   🎯 Campagne: EB-SERVICE-Courrier-GeneralServices-01-25-09-Q5-01');
    console.log('   👤 Utilisateur: Robert Songo (rsongo) - MANAGER');
    console.log('   🏢 Business Unit: EB-SERVICE');
    console.log('   📊 Statut: BROUILLON\n');
    
    console.log('🔍 ANALYSE DES PERMISSIONS:');
    console.log('============================');
    
    // 1. Vérifier si Robert Songo est le créateur
    const campaignQuery = `
      SELECT created_by FROM prospecting_campaigns WHERE id = $1
    `;
    const campaignResult = await client.query(campaignQuery, [campaignId]);
    const isCreator = campaignResult.rows[0].created_by === userId;
    
    console.log(`   ✅ Créateur de la campagne: ${isCreator ? 'OUI' : 'NON'}`);
    if (!isCreator) {
      console.log(`      → Créateur: Raphaël Ngos (ID: ${campaignResult.rows[0].created_by})`);
    }
    
    // 2. Vérifier le collaborateur_id de Robert Songo
    const userQuery = `
      SELECT collaborateur_id FROM users WHERE id = $1
    `;
    const userResult = await client.query(userQuery, [userId]);
    const collaborateurId = userResult.rows[0].collaborateur_id;
    
    console.log(`   ✅ Collaborateur ID: ${collaborateurId ? collaborateurId : 'NULL'}`);
    
    // 3. Vérifier les responsables de la Business Unit
    const buQuery = `
      SELECT 
        responsable_principal_id,
        responsable_adjoint_id,
        c1.prenom as principal_prenom,
        c1.nom as principal_nom,
        c2.prenom as adjoint_prenom,
        c2.nom as adjoint_nom
      FROM business_units bu
      LEFT JOIN collaborateurs c1 ON bu.responsable_principal_id = c1.id
      LEFT JOIN collaborateurs c2 ON bu.responsable_adjoint_id = c2.id
      WHERE bu.id = 'dd4266fe-4269-45e7-a51b-287f9802290b'
    `;
    const buResult = await client.query(buQuery);
    
    let isBUManager = false;
    if (buResult.rows.length > 0 && collaborateurId) {
      const bu = buResult.rows[0];
      isBUManager = collaborateurId === bu.responsable_principal_id || collaborateurId === bu.responsable_adjoint_id;
      
      console.log(`   ✅ Responsable BU principal: ${bu.principal_prenom} ${bu.principal_nom} (ID: ${bu.responsable_principal_id})`);
      console.log(`   ✅ Responsable BU adjoint: ${bu.adjoint_prenom} ${bu.adjoint_nom} (ID: ${bu.responsable_adjoint_id})`);
      console.log(`   ✅ Robert Songo est responsable BU: ${isBUManager ? 'OUI' : 'NON'}`);
    } else {
      console.log(`   ❌ Robert Songo est responsable BU: NON (collaborateur_id = null)`);
    }
    
    console.log('');
    
    // 4. Résultat final
    const isAuthorized = isCreator || isBUManager;
    
    console.log('🎯 RÉSULTAT FINAL:');
    console.log('==================');
    console.log(`   🚫 AUTORISÉ: ${isAuthorized ? 'OUI' : 'NON'}`);
    console.log('');
    
    if (!isAuthorized) {
      console.log('❌ PROBLÈME IDENTIFIÉ:');
      console.log('======================');
      console.log('   Robert Songo ne peut pas soumettre la campagne car:');
      console.log('   1. Il n\'est pas le créateur de la campagne');
      console.log('   2. Son collaborateur_id est NULL');
      console.log('   3. Sans collaborateur_id, il ne peut pas être identifié comme responsable BU/Division');
      console.log('');
      
      console.log('🔧 SOLUTIONS:');
      console.log('=============');
      console.log('   Option 1: Associer Robert Songo à un collaborateur');
      console.log('      - Créer un enregistrement dans la table collaborateurs');
      console.log('      - Mettre à jour users.collaborateur_id');
      console.log('      - L\'associer comme responsable de la BU EB-SERVICE');
      console.log('');
      console.log('   Option 2: Modifier la logique d\'autorisation');
      console.log('      - Permettre aux utilisateurs avec le rôle MANAGER de soumettre');
      console.log('      - Modifier la fonction checkCampaignAuthorization()');
      console.log('');
      console.log('   Option 3: Faire soumettre par le créateur');
      console.log('      - Raphaël Ngos (rngos1) peut soumettre la campagne');
      console.log('      - Il est le créateur et a les permissions');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    if (client) client.release();
    await pool.end();
    console.log('\n✅ Diagnostic terminé !');
  }
}

// Exécuter le script
if (require.main === module) {
  finalDiagnosis();
}

module.exports = { finalDiagnosis };




