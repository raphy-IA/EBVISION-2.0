const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Script pour diagnostiquer pourquoi un utilisateur n'est pas associé à un collaborateur
async function debugUserCollaborateurAssociation() {
  console.log('🔍 Diagnostic de l\'association utilisateur-collaborateur...\n');
  
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
    
    // 1. Vérifier Robert Songo
    console.log('👤 VÉRIFICATION DE ROBERT SONGO:');
    console.log('=================================');
    
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
      WHERE u.prenom = 'Robert' AND u.nom = 'Songo'
    `;
    
    const userResult = await client.query(userQuery);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Utilisateur Robert Songo non trouvé');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`   ID: ${user.id}`);
    console.log(`   Login: ${user.login}`);
    console.log(`   Nom: ${user.prenom} ${user.nom}`);
    console.log(`   Rôle: ${user.role}`);
    console.log(`   Collaborateur ID: ${user.collaborateur_id || 'NULL'}`);
    console.log(`   Nom collaborateur: ${user.collab_prenom || 'NULL'} ${user.collab_nom || 'NULL'}`);
    console.log(`   BU du collaborateur: ${user.collab_bu_id || 'NULL'}`);
    console.log(`   Division du collaborateur: ${user.collab_div_id || 'NULL'}`);
    console.log('');
    
    // 2. Chercher un collaborateur Robert Songo
    console.log('🔍 RECHERCHE D\'UN COLLABORATEUR ROBERT SONGO:');
    console.log('==============================================');
    
    const collabQuery = `
      SELECT 
        c.id,
        c.nom,
        c.prenom,
        c.email,
        c.business_unit_id,
        c.division_id,
        c.statut,
        c.created_at,
        u.id as user_id,
        u.login as user_login
      FROM collaborateurs c
      LEFT JOIN users u ON c.id = u.collaborateur_id
      WHERE c.prenom ILIKE '%robert%' AND c.nom ILIKE '%songo%'
    `;
    
    const collabResult = await client.query(collabQuery);
    
    if (collabResult.rows.length > 0) {
      console.log(`✅ ${collabResult.rows.length} collaborateur(s) trouvé(s):`);
      collabResult.rows.forEach((collab, index) => {
        console.log(`   ${index + 1}. ID: ${collab.id}`);
        console.log(`      Nom: ${collab.prenom} ${collab.nom}`);
        console.log(`      Email: ${collab.email || 'NULL'}`);
        console.log(`      BU: ${collab.business_unit_id || 'NULL'}`);
        console.log(`      Division: ${collab.division_id || 'NULL'}`);
        console.log(`      Statut: ${collab.statut}`);
        console.log(`      Créé le: ${new Date(collab.created_at).toLocaleString('fr-FR')}`);
        console.log(`      Utilisateur associé: ${collab.user_id ? `${collab.user_login} (${collab.user_id})` : 'AUCUN'}`);
        console.log('      ---');
      });
    } else {
      console.log('❌ Aucun collaborateur Robert Songo trouvé');
    }
    console.log('');
    
    // 3. Vérifier le processus de création d'utilisateur
    console.log('🔍 VÉRIFICATION DU PROCESSUS DE CRÉATION:');
    console.log('==========================================');
    
    // Chercher dans les logs ou l'historique
    const recentUsersQuery = `
      SELECT 
        u.id,
        u.login,
        u.prenom,
        u.nom,
        u.role,
        u.collaborateur_id,
        u.created_at
      FROM users u
      WHERE u.role = 'MANAGER'
      ORDER BY u.created_at DESC
      LIMIT 10
    `;
    
    const recentUsersResult = await client.query(recentUsersQuery);
    
    console.log('👥 Utilisateurs MANAGER récents:');
    recentUsersResult.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.prenom} ${user.nom} (${user.login})`);
      console.log(`      Rôle: ${user.role}`);
      console.log(`      Collaborateur ID: ${user.collaborateur_id || 'NULL'}`);
      console.log(`      Créé le: ${new Date(user.created_at).toLocaleString('fr-FR')}`);
      console.log('      ---');
    });
    console.log('');
    
    // 4. Vérifier la fonction de génération de compte utilisateur
    console.log('🔍 VÉRIFICATION DE LA FONCTION DE GÉNÉRATION:');
    console.log('==============================================');
    
    // Chercher des collaborateurs sans utilisateur associé
    const orphanedCollabsQuery = `
      SELECT 
        c.id,
        c.nom,
        c.prenom,
        c.email,
        c.business_unit_id,
        c.division_id,
        c.statut,
        c.created_at
      FROM collaborateurs c
      LEFT JOIN users u ON c.id = u.collaborateur_id
      WHERE u.id IS NULL
      ORDER BY c.created_at DESC
      LIMIT 10
    `;
    
    const orphanedCollabsResult = await client.query(orphanedCollabsQuery);
    
    if (orphanedCollabsResult.rows.length > 0) {
      console.log(`📋 ${orphanedCollabsResult.rows.length} collaborateur(s) sans utilisateur associé:`);
      orphanedCollabsResult.rows.forEach((collab, index) => {
        console.log(`   ${index + 1}. ${collab.prenom} ${collab.nom} (${collab.email || 'SANS_EMAIL'})`);
        console.log(`      ID: ${collab.id}`);
        console.log(`      BU: ${collab.business_unit_id || 'NULL'}`);
        console.log(`      Division: ${collab.division_id || 'NULL'}`);
        console.log(`      Statut: ${collab.statut}`);
        console.log(`      Créé le: ${new Date(collab.created_at).toLocaleString('fr-FR')}`);
        console.log('      ---');
      });
    } else {
      console.log('✅ Tous les collaborateurs ont un utilisateur associé');
    }
    console.log('');
    
    // 5. Recommandations
    console.log('💡 RECOMMANDATIONS:');
    console.log('===================');
    
    if (user.collaborateur_id === null) {
      console.log('❌ PROBLÈME IDENTIFIÉ:');
      console.log('   Robert Songo n\'est pas associé à un collaborateur');
      console.log('');
      console.log('🔧 SOLUTIONS:');
      console.log('   1. Créer un collaborateur Robert Songo');
      console.log('   2. Associer l\'utilisateur au collaborateur');
      console.log('   3. Vérifier le processus de génération de compte utilisateur');
      console.log('');
      
      if (collabResult.rows.length > 0) {
        console.log('✅ COLLABORATEUR EXISTANT TROUVÉ:');
        console.log('   Un collaborateur Robert Songo existe déjà');
        console.log('   Il suffit de l\'associer à l\'utilisateur');
        console.log('');
        console.log('🔧 COMMANDE SQL POUR ASSOCIER:');
        const collabId = collabResult.rows[0].id;
        console.log(`   UPDATE users SET collaborateur_id = '${collabId}' WHERE id = '${user.id}';`);
      } else {
        console.log('❌ AUCUN COLLABORATEUR TROUVÉ:');
        console.log('   Il faut créer un collaborateur Robert Songo');
        console.log('   Puis l\'associer à l\'utilisateur');
      }
    } else {
      console.log('✅ L\'utilisateur est déjà associé à un collaborateur');
      console.log('   Le problème de soumission de campagne est ailleurs');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error.message);
  } finally {
    if (client) client.release();
    await pool.end();
    console.log('\n✅ Diagnostic terminé !');
  }
}

// Exécuter le script
if (require.main === module) {
  debugUserCollaborateurAssociation();
}

module.exports = { debugUserCollaborateurAssociation };




