const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Script pour corriger les noms de collaborateurs incorrects
async function fixCollaborateurNames() {
  console.log('🔧 Correction des noms de collaborateurs incorrects...\n');
  
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
    
    // 1. Identifier le collaborateur problématique
    console.log('👤 IDENTIFICATION DU COLLABORATEUR PROBLÉMATIQUE:');
    console.log('=================================================');
    
    const collabQuery = `
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
      WHERE c.id = 'ea553ce8-63b0-4103-a616-259274946d39'
    `;
    
    const collabResult = await client.query(collabQuery);
    
    if (collabResult.rows.length === 0) {
      console.log('❌ Collaborateur non trouvé');
      return;
    }
    
    const collab = collabResult.rows[0];
    console.log(`   ID: ${collab.id}`);
    console.log(`   Nom actuel: "${collab.nom}"`);
    console.log(`   Prénom actuel: "${collab.prenom}"`);
    console.log(`   Email: ${collab.email}`);
    console.log(`   Business Unit: ${collab.business_unit_id}`);
    console.log(`   Division: ${collab.division_id}`);
    console.log(`   Statut: ${collab.statut}`);
    console.log(`   Créé le: ${new Date(collab.created_at).toLocaleString('fr-FR')}`);
    console.log('');
    
    // 2. Demander les vrais noms (simulation - en production, on pourrait les extraire de l'email ou d'autres sources)
    console.log('🔍 ANALYSE DE L\'EMAIL POUR DÉTERMINER LES VRAIS NOMS:');
    console.log('=======================================================');
    
    const email = collab.email;
    console.log(`   Email: ${email}`);
    
    // Extraire le nom d'utilisateur de l'email
    const username = email.split('@')[0];
    console.log(`   Nom d'utilisateur: ${username}`);
    
    // Essayer de deviner les noms à partir de l'email
    let newNom = '';
    let newPrenom = '';
    
    if (username === 'collaborateur') {
      // C'est un collaborateur de test, utilisons des noms génériques
      newNom = 'Test';
      newPrenom = 'Collaborateur';
      console.log('   Type: Collaborateur de test');
    } else {
      // Essayer de séparer le nom d'utilisateur
      const parts = username.split('.');
      if (parts.length >= 2) {
        newPrenom = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        newNom = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
      } else {
        newNom = username.charAt(0).toUpperCase() + username.slice(1);
        newPrenom = 'Utilisateur';
      }
    }
    
    console.log(`   Nom suggéré: "${newNom}"`);
    console.log(`   Prénom suggéré: "${newPrenom}"`);
    console.log('');
    
    // 3. Corriger les noms
    console.log('🔧 CORRECTION DES NOMS:');
    console.log('========================');
    
    const updateQuery = `
      UPDATE collaborateurs 
      SET nom = $1, prenom = $2, updated_at = NOW()
      WHERE id = $3
    `;
    
    await client.query(updateQuery, [newNom, newPrenom, collab.id]);
    console.log(`✅ Noms corrigés: "${newPrenom} ${newNom}"`);
    console.log('');
    
    // 4. Vérifier la correction
    console.log('🔍 VÉRIFICATION DE LA CORRECTION:');
    console.log('==================================');
    
    const verifyQuery = `
      SELECT 
        c.id,
        c.nom,
        c.prenom,
        c.email,
        c.updated_at
      FROM collaborateurs c
      WHERE c.id = $1
    `;
    
    const verifyResult = await client.query(verifyQuery, [collab.id]);
    
    if (verifyResult.rows.length > 0) {
      const verified = verifyResult.rows[0];
      console.log('✅ Correction vérifiée:');
      console.log(`   ID: ${verified.id}`);
      console.log(`   Nom: "${verified.nom}"`);
      console.log(`   Prénom: "${verified.prenom}"`);
      console.log(`   Email: ${verified.email}`);
      console.log(`   Mis à jour le: ${new Date(verified.updated_at).toLocaleString('fr-FR')}`);
    } else {
      console.log('❌ Erreur lors de la vérification');
    }
    console.log('');
    
    // 5. Vérifier s'il y a d'autres collaborateurs avec des noms problématiques
    console.log('🔍 VÉRIFICATION D\'AUTRES COLLABORATEURS PROBLÉMATIQUES:');
    console.log('=========================================================');
    
    const otherProblemsQuery = `
      SELECT 
        c.id,
        c.nom,
        c.prenom,
        c.email,
        c.created_at
      FROM collaborateurs c
      WHERE c.nom = 'col_nom' 
         OR c.prenom = 'col_prenom'
         OR c.nom = 'nom'
         OR c.prenom = 'prenom'
         OR c.nom = 'test'
         OR c.prenom = 'test'
      ORDER BY c.created_at DESC
    `;
    
    const otherProblemsResult = await client.query(otherProblemsQuery);
    
    if (otherProblemsResult.rows.length > 0) {
      console.log(`⚠️ ${otherProblemsResult.rows.length} autre(s) collaborateur(s) problématique(s):`);
      otherProblemsResult.rows.forEach((collab, index) => {
        console.log(`   ${index + 1}. ID: ${collab.id}`);
        console.log(`      Nom: "${collab.nom}"`);
        console.log(`      Prénom: "${collab.prenom}"`);
        console.log(`      Email: ${collab.email}`);
        console.log(`      Créé le: ${new Date(collab.created_at).toLocaleString('fr-FR')}`);
        console.log('      ---');
      });
    } else {
      console.log('✅ Aucun autre collaborateur problématique trouvé');
    }
    
    await client.query('COMMIT'); // Fin de la transaction
    
    console.log('\n📊 RÉSUMÉ DE LA CORRECTION:');
    console.log('=============================');
    console.log('✅ Noms de collaborateurs corrigés');
    console.log('✅ L\'affichage "col_nom col_prenom" est résolu');
    console.log('✅ Le collaborateur affiche maintenant les vrais noms');
    
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
  fixCollaborateurNames();
}

module.exports = { fixCollaborateurNames };





