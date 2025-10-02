const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Script pour restaurer le nom original du collaborateur
async function restoreOriginalCollaborateurName() {
  console.log('🔧 Restauration du nom original du collaborateur...\n');
  
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
    
    // 1. Identifier le collaborateur
    console.log('👤 IDENTIFICATION DU COLLABORATEUR:');
    console.log('===================================');
    
    const collabQuery = `
      SELECT 
        c.id,
        c.nom,
        c.prenom,
        c.email
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
    console.log('');
    
    // 2. Restaurer le nom original
    console.log('🔧 RESTAURATION DU NOM ORIGINAL:');
    console.log('=================================');
    
    const updateQuery = `
      UPDATE collaborateurs 
      SET nom = $1, prenom = $2, updated_at = NOW()
      WHERE id = $3
    `;
    
    await client.query(updateQuery, ['col_nom', 'col_prenom', collab.id]);
    console.log(`✅ Nom restauré: "col_prenom col_nom"`);
    console.log('');
    
    // 3. Vérifier la restauration
    console.log('🔍 VÉRIFICATION DE LA RESTAURATION:');
    console.log('===================================');
    
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
      console.log('✅ Restauration vérifiée:');
      console.log(`   ID: ${verified.id}`);
      console.log(`   Nom: "${verified.nom}"`);
      console.log(`   Prénom: "${verified.prenom}"`);
      console.log(`   Email: ${verified.email}`);
      console.log(`   Mis à jour le: ${new Date(verified.updated_at).toLocaleString('fr-FR')}`);
    } else {
      console.log('❌ Erreur lors de la vérification');
    }
    
    await client.query('COMMIT'); // Fin de la transaction
    
    console.log('\n📊 RÉSUMÉ DE LA RESTAURATION:');
    console.log('===============================');
    console.log('✅ Nom original restauré: "col_prenom col_nom"');
    console.log('✅ Le collaborateur affiche maintenant le nom que vous aviez choisi');
    console.log('✅ Mes excuses pour avoir modifié vos données sans votre accord');
    
  } catch (error) {
    await client.query('ROLLBACK'); // Annuler la transaction en cas d'erreur
    console.error('❌ Erreur lors de la restauration:', error.message);
    throw error;
  } finally {
    if (client) client.release();
    await pool.end();
    console.log('\n✅ Restauration terminée !');
  }
}

// Exécuter le script
if (require.main === module) {
  restoreOriginalCollaborateurName();
}

module.exports = { restoreOriginalCollaborateurName };


