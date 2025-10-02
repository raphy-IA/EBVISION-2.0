const fs = require('fs');
const { pool } = require('../src/utils/database');

async function analyzeOpportunityTypesConfig() {
  console.log('🚀 Démarrage de l\'analyse...');
  
  try {
    console.log('🔍 Analyse de la configuration des types d\'opportunité en local...\n');
    
    // 1. Récupérer tous les types d'opportunité
    const typesQuery = `
      SELECT id, nom, code, description, couleur, default_probability, default_duration_days, created_at, updated_at
      FROM opportunity_types 
      ORDER BY nom
    `;
    const typesResult = await pool.query(typesQuery);
    const types = typesResult.rows;
    
    console.log(`📊 ${types.length} types d'opportunité trouvés :`);
    types.forEach(type => {
      console.log(`  - ${type.nom} (ID: ${type.id})`);
    });
    console.log('');
    
    // 2. Pour chaque type, récupérer les étapes
    const fullConfig = [];
    
    for (const type of types) {
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
    
    // 3. Sauvegarder la configuration complète dans un fichier JSON
    const outputFile = 'scripts/opportunity-types-config-local.json';
    fs.writeFileSync(outputFile, JSON.stringify(fullConfig, null, 2));
    
    console.log(`💾 Configuration sauvegardée dans: ${outputFile}`);
    
    // 4. Afficher un résumé
    console.log('\n📊 RÉSUMÉ DE LA CONFIGURATION LOCALE:');
    console.log('=====================================');
    
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
      
      console.log(`\n🏷️  Type: ${typeName}`);
      console.log(`   📋 Étapes: ${stagesCount}`);
      console.log(`   ✅ Actions: ${actionsCount}`);
      console.log(`   📄 Documents: ${documentsCount}`);
      
      // Détail des étapes
      config.stages.forEach(stage => {
        console.log(`   └─ ${stage.stage_name} (ordre: ${stage.stage_order})`);
        if (stage.requiredActions.length > 0) {
          console.log(`      Actions: ${stage.requiredActions.map(a => a.action_type).join(', ')}`);
        }
        if (stage.requiredDocuments.length > 0) {
          console.log(`      Documents: ${stage.requiredDocuments.map(d => d.document_type).join(', ')}`);
        }
      });
    });
    
    console.log('\n📈 TOTAUX:');
    console.log(`   Types d'opportunité: ${fullConfig.length}`);
    console.log(`   Étapes: ${totalStages}`);
    console.log(`   Actions requises: ${totalActions}`);
    console.log(`   Documents requis: ${totalDocuments}`);
    
    return fullConfig;
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error);
    throw error;
  } finally {
    // Ne pas fermer le pool car il est partagé
  }
}

// Exécuter l'analyse
if (require.main === module) {
  analyzeOpportunityTypesConfig()
    .then(() => {
      console.log('\n✅ Analyse terminée avec succès !');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
}

module.exports = { analyzeOpportunityTypesConfig };
