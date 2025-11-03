const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Script pour diagnostiquer le problème d'affichage "col_nom col_prenom"
async function debugCollaborateurDisplayIssue() {
  console.log('🔍 Diagnostic du problème d\'affichage des collaborateurs...\n');
  
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
    
    // 1. Vérifier le collaborateur problématique
    console.log('👤 VÉRIFICATION DU COLLABORATEUR PROBLÉMATIQUE:');
    console.log('===============================================');
    
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
        bu.nom as bu_name,
        d.nom as div_name
      FROM collaborateurs c
      LEFT JOIN business_units bu ON c.business_unit_id = bu.id
      LEFT JOIN divisions d ON c.division_id = d.id
      WHERE c.id = 'ea553ce8-63b0-4103-a616-259274946d39'
    `;
    
    const collabResult = await client.query(collabQuery);
    
    if (collabResult.rows.length === 0) {
      console.log('❌ Collaborateur non trouvé');
      return;
    }
    
    const collab = collabResult.rows[0];
    console.log(`   ID: ${collab.id}`);
    console.log(`   Nom: "${collab.nom}"`);
    console.log(`   Prénom: "${collab.prenom}"`);
    console.log(`   Email: ${collab.email || 'NULL'}`);
    console.log(`   Business Unit: ${collab.bu_name || 'NULL'} (${collab.business_unit_id || 'NULL'})`);
    console.log(`   Division: ${collab.div_name || 'NULL'} (${collab.division_id || 'NULL'})`);
    console.log(`   Statut: ${collab.statut}`);
    console.log(`   Créé le: ${new Date(collab.created_at).toLocaleString('fr-FR')}`);
    console.log('');
    
    // 2. Vérifier s'il y a des collaborateurs avec des noms vides ou NULL
    console.log('🔍 VÉRIFICATION DES NOMS VIDES OU NULL:');
    console.log('=======================================');
    
    const emptyNamesQuery = `
      SELECT 
        c.id,
        c.nom,
        c.prenom,
        c.email,
        c.created_at
      FROM collaborateurs c
      WHERE c.nom IS NULL 
         OR c.prenom IS NULL 
         OR c.nom = '' 
         OR c.prenom = ''
         OR c.nom = 'col_nom'
         OR c.prenom = 'col_prenom'
      ORDER BY c.created_at DESC
    `;
    
    const emptyNamesResult = await client.query(emptyNamesQuery);
    
    if (emptyNamesResult.rows.length > 0) {
      console.log(`⚠️ ${emptyNamesResult.rows.length} collaborateur(s) avec des noms problématiques:`);
      emptyNamesResult.rows.forEach((collab, index) => {
        console.log(`   ${index + 1}. ID: ${collab.id}`);
        console.log(`      Nom: "${collab.nom || 'NULL'}"`);
        console.log(`      Prénom: "${collab.prenom || 'NULL'}"`);
        console.log(`      Email: ${collab.email || 'NULL'}`);
        console.log(`      Créé le: ${new Date(collab.created_at).toLocaleString('fr-FR')}`);
        console.log('      ---');
      });
    } else {
      console.log('✅ Aucun collaborateur avec des noms problématiques trouvé');
    }
    console.log('');
    
    // 3. Vérifier les collaborateurs récents
    console.log('📅 COLLABORATEURS RÉCENTS:');
    console.log('===========================');
    
    const recentCollabsQuery = `
      SELECT 
        c.id,
        c.nom,
        c.prenom,
        c.email,
        c.created_at
      FROM collaborateurs c
      ORDER BY c.created_at DESC
      LIMIT 10
    `;
    
    const recentCollabsResult = await client.query(recentCollabsQuery);
    
    console.log(`📊 ${recentCollabsResult.rows.length} collaborateur(s) récent(s):`);
    recentCollabsResult.rows.forEach((collab, index) => {
      console.log(`   ${index + 1}. ${collab.prenom} ${collab.nom} (${collab.email || 'SANS_EMAIL'})`);
      console.log(`      ID: ${collab.id}`);
      console.log(`      Créé le: ${new Date(collab.created_at).toLocaleString('fr-FR')}`);
      console.log('      ---');
    });
    console.log('');
    
    // 4. Vérifier la structure de la table
    console.log('📋 STRUCTURE DE LA TABLE COLLABORATEURS:');
    console.log('=========================================');
    
    const structureQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'collaborateurs'
      AND column_name IN ('nom', 'prenom', 'email')
      ORDER BY ordinal_position
    `;
    
    const structureResult = await client.query(structureQuery);
    
    structureResult.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'}) ${row.column_default ? `default: ${row.column_default}` : ''}`);
    });
    console.log('');
    
    // 5. Recommandations
    console.log('💡 RECOMMANDATIONS:');
    console.log('===================');
    
    if (emptyNamesResult.rows.length > 0) {
      console.log('❌ PROBLÈMES DÉTECTÉS:');
      console.log('   1. Des collaborateurs ont des noms vides ou incorrects');
      console.log('   2. Cela peut causer l\'affichage "col_nom col_prenom"');
      console.log('');
      console.log('🔧 SOLUTIONS:');
      console.log('   1. Corriger les noms des collaborateurs problématiques');
      console.log('   2. Vérifier le processus de création de collaborateurs');
      console.log('   3. Ajouter des validations côté frontend et backend');
    } else {
      console.log('✅ Aucun problème de nom détecté dans la base de données');
      console.log('   Le problème pourrait venir du code JavaScript frontend');
      console.log('');
      console.log('🔧 VÉRIFICATIONS À FAIRE:');
      console.log('   1. Vérifier la fonction displayCollaborateurs() dans collaborateurs.js');
      console.log('   2. Vérifier que les données sont correctement mappées');
      console.log('   3. Vérifier les templates d\'affichage');
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
  debugCollaborateurDisplayIssue();
}

module.exports = { debugCollaborateurDisplayIssue };














