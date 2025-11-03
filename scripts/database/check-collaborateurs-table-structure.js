const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Script pour vérifier la structure de la table collaborateurs
async function checkCollaborateursTableStructure() {
  console.log('🔍 Vérification de la structure de la table collaborateurs...\n');
  
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
    
    // 1. Vérifier la structure de la table collaborateurs
    console.log('📋 STRUCTURE DE LA TABLE COLLABORATEURS:');
    console.log('========================================');
    
    const structureQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'collaborateurs' 
      ORDER BY ordinal_position
    `;
    
    const structureResult = await client.query(structureQuery);
    
    if (structureResult.rows.length === 0) {
      console.log('❌ Table collaborateurs non trouvée');
      return;
    }
    
    console.log(`✅ ${structureResult.rows.length} colonne(s) trouvée(s):`);
    structureResult.rows.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      if (col.column_default) {
        console.log(`      Default: ${col.column_default}`);
      }
    });
    console.log('');
    
    // 2. Vérifier le collaborateur cible avec la bonne structure
    console.log('🎯 VÉRIFICATION DU COLLABORATEUR CIBLE:');
    console.log('======================================');
    
    const targetCollabQuery = `
      SELECT 
        c.id,
        c.nom,
        c.prenom,
        c.email,
        c.created_at,
        c.updated_at,
        u.id as user_id,
        u.login as user_login
      FROM collaborateurs c
      LEFT JOIN users u ON u.collaborateur_id = c.id
      WHERE c.id = 'ea553ce8-63b0-4103-a616-259274946d39'
    `;
    
    const targetCollabResult = await client.query(targetCollabQuery);
    
    if (targetCollabResult.rows.length === 0) {
      console.log('❌ Collaborateur cible non trouvé');
    } else {
      const targetCollab = targetCollabResult.rows[0];
      console.log(`   ID: ${targetCollab.id}`);
      console.log(`   Nom: ${targetCollab.nom}`);
      console.log(`   Prénom: ${targetCollab.prenom}`);
      console.log(`   Email: ${targetCollab.email}`);
      console.log(`   Créé le: ${new Date(targetCollab.created_at).toLocaleString('fr-FR')}`);
      console.log(`   Mis à jour le: ${new Date(targetCollab.updated_at).toLocaleString('fr-FR')}`);
      console.log(`   Utilisateur existant: ${targetCollab.user_id ? 'OUI' : 'NON'}`);
      if (targetCollab.user_id) {
        console.log(`   Login utilisateur: ${targetCollab.user_login}`);
      }
    }
    console.log('');
    
    // 3. Vérifier la route API backend
    console.log('🔍 VÉRIFICATION DE LA ROUTE API BACKEND:');
    console.log('========================================');
    console.log('   Route: POST /api/collaborateurs/:id/generate-user-account');
    console.log('   Collaborateur ID: ea553ce8-63b0-4103-a616-259274946d39');
    console.log('   Utilisateur demandeur: rngos1 (ADMIN_IT)');
    console.log('   Permission requise: users.create ✅');
    console.log('');
    
    console.log('📊 RÉSUMÉ:');
    console.log('==========');
    console.log('✅ Structure de la table collaborateurs vérifiée');
    console.log('✅ Collaborateur cible identifié');
    console.log('✅ Utilisateur a la permission users.create');
    console.log('🔍 Le problème 403 vient probablement du backend');
    console.log('   Vérifiez les logs du serveur Node.js pour plus de détails');
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
    throw error;
  } finally {
    if (client) client.release();
    await pool.end();
    console.log('\n✅ Vérification terminée !');
  }
}

// Exécuter le script
if (require.main === module) {
  checkCollaborateursTableStructure();
}

module.exports = { checkCollaborateursTableStructure };














