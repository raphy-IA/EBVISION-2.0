const { pool } = require('../src/utils/database');

// Script pour vérifier la cohérence de la base de données
async function checkDatabaseConsistency() {
  console.log('🔍 Vérification de la cohérence de la base de données...\n');
  
  try {
    let issuesFound = 0;
    
    // 1. Vérifier les types d'opportunité
    console.log('📊 VÉRIFICATION DES TYPES D\'OPPORTUNITÉ:');
    console.log('========================================');
    
    const typesQuery = `
      SELECT id, nom, name, code, description, couleur, default_probability, default_duration_days
      FROM opportunity_types 
      ORDER BY nom
    `;
    const typesResult = await pool.query(typesQuery);
    const types = typesResult.rows;
    
    console.log(`✅ ${types.length} types d'opportunité trouvés\n`);
    
    for (const type of types) {
      console.log(`🏷️  Type: ${type.nom || 'SANS_NOM'}`);
      console.log(`   ID: ${type.id}`);
      console.log(`   Code: ${type.code || 'Sans code'}`);
      console.log(`   Probabilité: ${type.default_probability}%`);
      console.log(`   Durée: ${type.default_duration_days} jours`);
      
      // Vérifier les problèmes potentiels
      if (!type.nom && !type.name) {
        console.log(`   ⚠️  PROBLÈME: Nom manquant`);
        issuesFound++;
      }
      if (type.nom !== type.name) {
        console.log(`   ⚠️  PROBLÈME: Incohérence nom/name (${type.nom} vs ${type.name})`);
        issuesFound++;
      }
      if (!type.code) {
        console.log(`   ⚠️  PROBLÈME: Code manquant`);
        issuesFound++;
      }
      
      console.log('');
    }
    
    // 2. Vérifier les étapes
    console.log('📋 VÉRIFICATION DES ÉTAPES:');
    console.log('============================');
    
    const stagesQuery = `
      SELECT 
        ost.id, ost.stage_name, ost.stage_order, ost.opportunity_type_id,
        ot.nom as type_name
      FROM opportunity_stage_templates ost
      LEFT JOIN opportunity_types ot ON ost.opportunity_type_id = ot.id
      ORDER BY ot.nom, ost.stage_order
    `;
    const stagesResult = await pool.query(stagesQuery);
    const stages = stagesResult.rows;
    
    console.log(`✅ ${stages.length} étapes trouvées\n`);
    
    // Grouper par type
    const stagesByType = {};
    stages.forEach(stage => {
      const typeName = stage.type_name || 'SANS_TYPE';
      if (!stagesByType[typeName]) {
        stagesByType[typeName] = [];
      }
      stagesByType[typeName].push(stage);
    });
    
    for (const [typeName, typeStages] of Object.entries(stagesByType)) {
      console.log(`🏷️  Type: ${typeName} (${typeStages.length} étapes)`);
      
      // Vérifier l'ordre des étapes
      const orders = typeStages.map(s => s.stage_order).sort((a, b) => a - b);
      const expectedOrders = Array.from({length: typeStages.length}, (_, i) => i + 1);
      
      if (JSON.stringify(orders) !== JSON.stringify(expectedOrders)) {
        console.log(`   ⚠️  PROBLÈME: Ordre des étapes incorrect (${orders.join(', ')})`);
        issuesFound++;
      }
      
      typeStages.forEach(stage => {
        console.log(`   ${stage.stage_order}. ${stage.stage_name}`);
      });
      console.log('');
    }
    
    // 3. Vérifier les actions requises
    console.log('🔧 VÉRIFICATION DES ACTIONS REQUISES:');
    console.log('======================================');
    
    const actionsQuery = `
      SELECT 
        sra.id, sra.action_type, sra.is_mandatory, sra.validation_order,
        ost.stage_name, ot.nom as type_name
      FROM stage_required_actions sra
      JOIN opportunity_stage_templates ost ON sra.stage_template_id = ost.id
      LEFT JOIN opportunity_types ot ON ost.opportunity_type_id = ot.id
      ORDER BY ot.nom, ost.stage_order, sra.validation_order
    `;
    const actionsResult = await pool.query(actionsQuery);
    const actions = actionsResult.rows;
    
    console.log(`✅ ${actions.length} actions requises trouvées\n`);
    
    // Grouper par étape
    const actionsByStage = {};
    actions.forEach(action => {
      const stageKey = `${action.type_name} - ${action.stage_name}`;
      if (!actionsByStage[stageKey]) {
        actionsByStage[stageKey] = [];
      }
      actionsByStage[stageKey].push(action);
    });
    
    for (const [stageKey, stageActions] of Object.entries(actionsByStage)) {
      console.log(`📋 ${stageKey} (${stageActions.length} actions)`);
      
      stageActions.forEach(action => {
        const mandatory = action.is_mandatory ? 'Obligatoire' : 'Optionnel';
        const order = action.validation_order ? `(ordre: ${action.validation_order})` : '';
        console.log(`   ✅ ${action.action_type} - ${mandatory} ${order}`);
      });
      console.log('');
    }
    
    // 4. Vérifier les documents requis
    console.log('📄 VÉRIFICATION DES DOCUMENTS REQUIS:');
    console.log('=====================================');
    
    const documentsQuery = `
      SELECT 
        srd.id, srd.document_type, srd.is_mandatory,
        ost.stage_name, ot.nom as type_name
      FROM stage_required_documents srd
      JOIN opportunity_stage_templates ost ON srd.stage_template_id = ost.id
      LEFT JOIN opportunity_types ot ON ost.opportunity_type_id = ot.id
      ORDER BY ot.nom, ost.stage_order
    `;
    const documentsResult = await pool.query(documentsQuery);
    const documents = documentsResult.rows;
    
    console.log(`✅ ${documents.length} documents requis trouvés\n`);
    
    // Grouper par étape
    const documentsByStage = {};
    documents.forEach(doc => {
      const stageKey = `${doc.type_name} - ${doc.stage_name}`;
      if (!documentsByStage[stageKey]) {
        documentsByStage[stageKey] = [];
      }
      documentsByStage[stageKey].push(doc);
    });
    
    for (const [stageKey, stageDocuments] of Object.entries(documentsByStage)) {
      console.log(`📋 ${stageKey} (${stageDocuments.length} documents)`);
      
      stageDocuments.forEach(doc => {
        const mandatory = doc.is_mandatory ? 'Obligatoire' : 'Optionnel';
        console.log(`   📄 ${doc.document_type} - ${mandatory}`);
      });
      console.log('');
    }
    
    // 5. Vérifier les relations orphelines
    console.log('🔗 VÉRIFICATION DES RELATIONS:');
    console.log('===============================');
    
    // Actions orphelines
    const orphanActionsQuery = `
      SELECT COUNT(*) as count
      FROM stage_required_actions sra
      LEFT JOIN opportunity_stage_templates ost ON sra.stage_template_id = ost.id
      WHERE ost.id IS NULL
    `;
    const orphanActionsResult = await pool.query(orphanActionsQuery);
    const orphanActionsCount = parseInt(orphanActionsResult.rows[0].count);
    
    if (orphanActionsCount > 0) {
      console.log(`⚠️  PROBLÈME: ${orphanActionsCount} actions orphelines (sans étape associée)`);
      issuesFound++;
    } else {
      console.log(`✅ Aucune action orpheline`);
    }
    
    // Documents orphelins
    const orphanDocsQuery = `
      SELECT COUNT(*) as count
      FROM stage_required_documents srd
      LEFT JOIN opportunity_stage_templates ost ON srd.stage_template_id = ost.id
      WHERE ost.id IS NULL
    `;
    const orphanDocsResult = await pool.query(orphanDocsQuery);
    const orphanDocsCount = parseInt(orphanDocsResult.rows[0].count);
    
    if (orphanDocsCount > 0) {
      console.log(`⚠️  PROBLÈME: ${orphanDocsCount} documents orphelins (sans étape associée)`);
      issuesFound++;
    } else {
      console.log(`✅ Aucun document orphelin`);
    }
    
    // Étapes orphelines
    const orphanStagesQuery = `
      SELECT COUNT(*) as count
      FROM opportunity_stage_templates ost
      LEFT JOIN opportunity_types ot ON ost.opportunity_type_id = ot.id
      WHERE ot.id IS NULL
    `;
    const orphanStagesResult = await pool.query(orphanStagesQuery);
    const orphanStagesCount = parseInt(orphanStagesResult.rows[0].count);
    
    if (orphanStagesCount > 0) {
      console.log(`⚠️  PROBLÈME: ${orphanStagesCount} étapes orphelines (sans type associé)`);
      issuesFound++;
    } else {
      console.log(`✅ Aucune étape orpheline`);
    }
    
    // 6. Résumé final
    console.log('\n📊 RÉSUMÉ DE LA COHÉRENCE:');
    console.log('===========================');
    console.log(`   Types d'opportunité: ${types.length}`);
    console.log(`   Étapes: ${stages.length}`);
    console.log(`   Actions requises: ${actions.length}`);
    console.log(`   Documents requis: ${documents.length}`);
    console.log(`   Problèmes détectés: ${issuesFound}`);
    
    if (issuesFound === 0) {
      console.log('\n🎉 Base de données cohérente ! Aucun problème détecté.');
    } else {
      console.log(`\n⚠️  ${issuesFound} problème(s) détecté(s). Vérifiez les détails ci-dessus.`);
    }
    
    // 7. Statistiques par type
    console.log('\n📈 STATISTIQUES PAR TYPE:');
    console.log('==========================');
    
    const statsQuery = `
      SELECT 
        ot.nom,
        COUNT(DISTINCT ost.id) as stages_count,
        COUNT(DISTINCT sra.id) as actions_count,
        COUNT(DISTINCT srd.id) as documents_count
      FROM opportunity_types ot
      LEFT JOIN opportunity_stage_templates ost ON ot.id = ost.opportunity_type_id
      LEFT JOIN stage_required_actions sra ON ost.id = sra.stage_template_id
      LEFT JOIN stage_required_documents srd ON ost.id = srd.stage_template_id
      GROUP BY ot.id, ot.nom
      ORDER BY ot.nom
    `;
    
    const statsResult = await pool.query(statsQuery);
    
    statsResult.rows.forEach(row => {
      console.log(`🏷️  ${row.nom}: ${row.stages_count} étapes, ${row.actions_count} actions, ${row.documents_count} documents`);
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    throw error;
  }
}

// Exécuter la vérification
if (require.main === module) {
  checkDatabaseConsistency()
    .then(() => {
      console.log('\n✅ Vérification terminée !');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
}

module.exports = { checkDatabaseConsistency };




