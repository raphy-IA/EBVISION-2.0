const { pool } = require('../src/utils/database');

// Script pour corriger le nom du type "Vente standard"
async function fixVenteStandardName() {
  console.log('🔧 Correction du nom du type "Vente standard"...\n');
  
  try {
    // 1. Chercher le type avec le code "VENTE_STD"
    const findTypeQuery = `
      SELECT id, nom, name, code, description 
      FROM opportunity_types 
      WHERE code = $1 OR nom LIKE $2 OR name LIKE $2
    `;
    const findTypeResult = await pool.query(findTypeQuery, ['VENTE_STD', '%Vente%']);
    
    if (findTypeResult.rows.length === 0) {
      console.log('❌ Aucun type "Vente standard" trouvé');
      return;
    }
    
    const type = findTypeResult.rows[0];
    console.log(`📋 Type trouvé:`);
    console.log(`   ID: ${type.id}`);
    console.log(`   Nom actuel: "${type.nom}"`);
    console.log(`   Name actuel: "${type.name}"`);
    console.log(`   Code: "${type.code}"`);
    console.log(`   Description: "${type.description}"`);
    
    // 2. Corriger le nom
    const updateQuery = `
      UPDATE opportunity_types 
      SET nom = $1, name = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `;
    
    await pool.query(updateQuery, ['Vente standard', type.id]);
    console.log('\n✅ Nom corrigé vers "Vente standard"');
    
    // 3. Vérifier la correction
    const verifyQuery = `
      SELECT id, nom, name, code, description 
      FROM opportunity_types 
      WHERE id = $1
    `;
    const verifyResult = await pool.query(verifyQuery, [type.id]);
    const correctedType = verifyResult.rows[0];
    
    console.log('\n📋 Type après correction:');
    console.log(`   ID: ${correctedType.id}`);
    console.log(`   Nom: "${correctedType.nom}"`);
    console.log(`   Name: "${correctedType.name}"`);
    console.log(`   Code: "${correctedType.code}"`);
    console.log(`   Description: "${correctedType.description}"`);
    
    // 4. Afficher toutes les étapes associées
    const stagesQuery = `
      SELECT stage_name, stage_order, description
      FROM opportunity_stage_templates 
      WHERE opportunity_type_id = $1 
      ORDER BY stage_order
    `;
    const stagesResult = await pool.query(stagesQuery, [type.id]);
    
    console.log('\n📋 Étapes associées:');
    stagesResult.rows.forEach(stage => {
      console.log(`   ${stage.stage_order}. ${stage.stage_name}`);
    });
    
    console.log('\n🎉 Correction terminée avec succès !');
    console.log('🔄 Rechargez la page pour voir le changement.');
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
    throw error;
  }
}

// Exécuter la correction
if (require.main === module) {
  fixVenteStandardName()
    .then(() => {
      console.log('\n✅ Correction terminée !');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
}

module.exports = { fixVenteStandardName };






