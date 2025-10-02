const fs = require('fs');
const { pool } = require('../src/utils/database');

// Script combiné pour corriger et synchroniser les types d'opportunité
async function fixAndSyncOpportunityTypes() {
  console.log('🔧 Correction et synchronisation des types d\'opportunité...\n');
  
  try {
    // 1. Analyser la configuration locale
    console.log('📊 Analyse de la configuration locale...');
    
    const typesQuery = `
      SELECT id, nom, code, description, couleur, default_probability, default_duration_days, created_at, updated_at
      FROM opportunity_types 
      ORDER BY nom
    `;
    const typesResult = await pool.query(typesQuery);
    const types = typesResult.rows;
    
    console.log(`✅ ${types.length} types d'opportunité trouvés\n`);
    
    // 2. Corriger les noms null
    console.log('🔧 Correction des noms null...');
    let fixedCount = 0;
    
    for (const type of types) {
      if (!type.nom) {
        const newName = type.code || `Type_${type.id}`;
        
        const updateQuery = `
          UPDATE opportunity_types 
          SET nom = $1, updated_at = CURRENT_TIMESTAMP 
          WHERE id = $2
        `;
        await pool.query(updateQuery, [newName, type.id]);
        
        console.log(`  ✅ Type corrigé: ID ${type.id} -> Nom: "${newName}"`);
        fixedCount++;
      }
    }
    
    if (fixedCount > 0) {
      console.log(`\n✅ ${fixedCount} types corrigés\n`);
    } else {
      console.log('\n✅ Aucune correction nécessaire\n');
    }
    
    // 3. Recharger les types corrigés
    const correctedTypesResult = await pool.query(typesQuery);
    const correctedTypes = correctedTypesResult.rows;
    
    // 4. Pour chaque type, récupérer la configuration complète
    const fullConfig = [];
    
    for (const type of correctedTypes) {
      console.log(`🔍 Analyse du type: ${type.nom}`);
      
      // Récupérer les étapes du type
      const stagesQuery = `
        SELECT id, stage_name, stage_order, description, min_duration_days, max_duration_days, 
               is_mandatory, validation_required, created_at, updated_at
        FROM opportunity_stage_templates 
        WHERE opportunity_type_id = $1 
        ORDER BY stage_order
      `;
      const stagesResult = await pool.query(stagesQuery, [type.id]);
      const stages = stagesResult.rows;
      
      console.log(`  📋 ${stages.length} étapes trouvées`);
      
      // Pour chaque étape, récupérer les actions et documents requis
      const stagesWithRequirements = [];
      
      for (const stage of stages) {
        console.log(`    🔧 Étape: ${stage.stage_name}`);
        
        // Récupérer les actions requises
        const actionsQuery = `
          SELECT id, action_type, is_mandatory, validation_order, created_at
          FROM stage_required_actions 
          WHERE stage_template_id = $1 
          ORDER BY validation_order, id
        `;
        const actionsResult = await pool.query(actionsQuery, [stage.id]);
        const actions = actionsResult.rows;
        
        // Récupérer les documents requis
        const documentsQuery = `
          SELECT id, document_type, is_mandatory, created_at
          FROM stage_required_documents 
          WHERE stage_template_id = $1 
          ORDER BY id
        `;
        const documentsResult = await pool.query(documentsQuery, [stage.id]);
        const documents = documentsResult.rows;
        
        console.log(`      ✅ ${actions.length} actions requises`);
        console.log(`      📄 ${documents.length} documents requis`);
        
        stagesWithRequirements.push({
          ...stage,
          requiredActions: actions,
          requiredDocuments: documents
        });
      }
      
      fullConfig.push({
        type: type,
        stages: stagesWithRequirements
      });
      
      console.log('');
    }
    
    // 5. Afficher le résumé final
    console.log('📊 RÉSUMÉ FINAL:');
    console.log('================');
    
    let totalStages = 0;
    let totalActions = 0;
    let totalDocuments = 0;
    
    fullConfig.forEach(config => {
      const typeName = config.type.nom;
      const stagesCount = config.stages.length;
      const actionsCount = config.stages.reduce((sum, stage) => sum + stage.requiredActions.length, 0);
      const documentsCount = config.stages.reduce((sum, stage) => sum + stage.requiredDocuments.length, 0);
      
      totalStages += stagesCount;
      totalActions += actionsCount;
      totalDocuments += documentsCount;
      
      console.log(`🏷️  ${typeName}: ${stagesCount} étapes, ${actionsCount} actions, ${documentsCount} documents`);
    });
    
    console.log('\n📈 TOTAUX:');
    console.log(`   Types d'opportunité: ${fullConfig.length}`);
    console.log(`   Étapes: ${totalStages}`);
    console.log(`   Actions requises: ${totalActions}`);
    console.log(`   Documents requis: ${totalDocuments}`);
    
    console.log('\n✅ Configuration analysée et corrigée avec succès !');
    console.log('🚀 Vous pouvez maintenant tester l\'interface de configuration des types d\'opportunité.');
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
    throw error;
  }
}

// Exécuter la correction
if (require.main === module) {
  fixAndSyncOpportunityTypes()
    .then(() => {
      console.log('\n✅ Correction terminée avec succès !');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
}

module.exports = { fixAndSyncOpportunityTypes };





