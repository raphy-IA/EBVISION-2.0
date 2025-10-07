const { pool } = require('../src/utils/database');

// Script pour créer le type d'opportunité "Vente standard" avec sa configuration complète
async function createVenteStandardType() {
  console.log('🚀 Création du type d\'opportunité "Vente standard"...\n');
  
  try {
    // 1. Vérifier si le type existe déjà
    const existingTypeQuery = `
      SELECT id FROM opportunity_types WHERE nom = $1 OR name = $1
    `;
    const existingTypeResult = await pool.query(existingTypeQuery, ['Vente standard']);
    
    let typeId;
    if (existingTypeResult.rows.length > 0) {
      typeId = existingTypeResult.rows[0].id;
      console.log(`✅ Type "Vente standard" existe déjà (ID: ${typeId})`);
    } else {
      // Créer le type d'opportunité
      const createTypeQuery = `
        INSERT INTO opportunity_types (nom, name, code, description, couleur, default_probability, default_duration_days, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `;
      const createTypeResult = await pool.query(createTypeQuery, [
        'Vente standard',
        'Vente standard',
        'VENTE_STD',
        'Processus de vente standard avec étapes de prospection, qualification, proposition et négociation',
        '#2c3e50',
        50,
        30,
        new Date(),
        new Date()
      ]);
      typeId = createTypeResult.rows[0].id;
      console.log(`✅ Type "Vente standard" créé (ID: ${typeId})`);
    }
    
    // 2. Définir les étapes du processus de vente standard
    const stages = [
      {
        name: 'Prospection',
        order: 1,
        description: 'Identification et approche des prospects',
        min_duration: 1,
        max_duration: 7,
        mandatory: true,
        validation_required: false
      },
      {
        name: 'Qualification',
        order: 2,
        description: 'Analyse des besoins et qualification du prospect',
        min_duration: 3,
        max_duration: 14,
        mandatory: true,
        validation_required: true
      },
      {
        name: 'Proposition',
        order: 3,
        description: 'Élaboration et présentation de la proposition commerciale',
        min_duration: 5,
        max_duration: 21,
        mandatory: true,
        validation_required: true
      },
      {
        name: 'Négociation',
        order: 4,
        description: 'Négociation des conditions et finalisation du contrat',
        min_duration: 3,
        max_duration: 14,
        mandatory: true,
        validation_required: true
      },
      {
        name: 'Clôture',
        order: 5,
        description: 'Signature du contrat et démarrage de la mission',
        min_duration: 1,
        max_duration: 7,
        mandatory: true,
        validation_required: true
      }
    ];
    
    // 3. Créer les étapes
    console.log('\n📋 Création des étapes...');
    const stageIds = [];
    
    for (const stageData of stages) {
      // Vérifier si l'étape existe
      const existingStageQuery = `
        SELECT id FROM opportunity_stage_templates 
        WHERE opportunity_type_id = $1 AND stage_name = $2
      `;
      const existingStageResult = await pool.query(existingStageQuery, [typeId, stageData.name]);
      
      let stageId;
      if (existingStageResult.rows.length > 0) {
        stageId = existingStageResult.rows[0].id;
        console.log(`  ✅ Étape existante: ${stageData.name}`);
      } else {
        // Créer l'étape
        const createStageQuery = `
          INSERT INTO opportunity_stage_templates (
            opportunity_type_id, stage_name, stage_order, description, 
            min_duration_days, max_duration_days, is_mandatory, validation_required, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id
        `;
        const createStageResult = await pool.query(createStageQuery, [
          typeId,
          stageData.name,
          stageData.order,
          stageData.description,
          stageData.min_duration,
          stageData.max_duration,
          stageData.mandatory,
          stageData.validation_required,
          new Date(),
          new Date()
        ]);
        stageId = createStageResult.rows[0].id;
        console.log(`  ✅ Étape créée: ${stageData.name}`);
      }
      
      stageIds.push({ id: stageId, name: stageData.name, order: stageData.order });
    }
    
    // 4. Définir les actions et documents requis pour chaque étape
    const requirements = {
      'Prospection': {
        actions: [
          { type: 'premier_contact', mandatory: true, order: 1 },
          { type: 'relance_effectuee', mandatory: false, order: 2 }
        ],
        documents: [
          { type: 'fiche_prospect', mandatory: true }
        ]
      },
      'Qualification': {
        actions: [
          { type: 'qualification_besoin', mandatory: true, order: 1 },
          { type: 'rdv_planifie', mandatory: true, order: 2 },
          { type: 'rdv_realise', mandatory: true, order: 3 }
        ],
        documents: [
          { type: 'compte_rendu_rdv', mandatory: true }
        ]
      },
      'Proposition': {
        actions: [
          { type: 'analyse_besoin_approfondie', mandatory: true, order: 1 },
          { type: 'proposition_envoyee', mandatory: true, order: 2 },
          { type: 'presentation_equipe', mandatory: false, order: 3 }
        ],
        documents: [
          { type: 'proposition_commerciale', mandatory: true },
          { type: 'elements_techniques', mandatory: true },
          { type: 'tarification', mandatory: true }
        ]
      },
      'Négociation': {
        actions: [
          { type: 'negociation_menee', mandatory: true, order: 1 },
          { type: 'conditions_acceptees', mandatory: true, order: 2 }
        ],
        documents: [
          { type: 'conditions_finales', mandatory: true },
          { type: 'planning_mission', mandatory: true }
        ]
      },
      'Clôture': {
        actions: [
          { type: 'contrat_prepare', mandatory: true, order: 1 },
          { type: 'contrat_signe', mandatory: true, order: 2 }
        ],
        documents: [
          { type: 'contrat_signe', mandatory: true },
          { type: 'bon_commande', mandatory: true }
        ]
      }
    };
    
    // 5. Créer les actions et documents requis
    console.log('\n🔧 Création des actions et documents requis...');
    
    for (const stageInfo of stageIds) {
      const stageName = stageInfo.name;
      const stageId = stageInfo.id;
      const stageRequirements = requirements[stageName];
      
      if (!stageRequirements) continue;
      
      console.log(`\n  📋 Étape: ${stageName}`);
      
      // Créer les actions requises
      for (const actionData of stageRequirements.actions) {
        // Vérifier si l'action existe
        const existingActionQuery = `
          SELECT id FROM stage_required_actions 
          WHERE stage_template_id = $1 AND action_type = $2
        `;
        const existingActionResult = await pool.query(existingActionQuery, [stageId, actionData.type]);
        
        if (existingActionResult.rows.length === 0) {
          // Créer l'action
          const createActionQuery = `
            INSERT INTO stage_required_actions (stage_template_id, action_type, is_mandatory, validation_order, created_at)
            VALUES ($1, $2, $3, $4, $5)
          `;
          await pool.query(createActionQuery, [
            stageId,
            actionData.type,
            actionData.mandatory,
            actionData.order,
            new Date()
          ]);
          console.log(`    ✅ Action ajoutée: ${actionData.type} ${actionData.mandatory ? '(obligatoire)' : '(optionnel)'}`);
        } else {
          console.log(`    ⏭️  Action existante: ${actionData.type}`);
        }
      }
      
      // Créer les documents requis
      for (const documentData of stageRequirements.documents) {
        // Vérifier si le document existe
        const existingDocQuery = `
          SELECT id FROM stage_required_documents 
          WHERE stage_template_id = $1 AND document_type = $2
        `;
        const existingDocResult = await pool.query(existingDocQuery, [stageId, documentData.type]);
        
        if (existingDocResult.rows.length === 0) {
          // Créer le document
          const createDocQuery = `
            INSERT INTO stage_required_documents (stage_template_id, document_type, is_mandatory, created_at)
            VALUES ($1, $2, $3, $4)
          `;
          await pool.query(createDocQuery, [
            stageId,
            documentData.type,
            documentData.mandatory,
            new Date()
          ]);
          console.log(`    ✅ Document ajouté: ${documentData.type} ${documentData.mandatory ? '(obligatoire)' : '(optionnel)'}`);
        } else {
          console.log(`    ⏭️  Document existant: ${documentData.type}`);
        }
      }
    }
    
    // 6. Afficher le résumé final
    console.log('\n📊 RÉSUMÉ DU TYPE "VENTE STANDARD":');
    console.log('=====================================');
    
    const summaryQuery = `
      SELECT 
        ost.stage_name,
        ost.stage_order,
        COUNT(DISTINCT sra.id) as actions_count,
        COUNT(DISTINCT srd.id) as documents_count
      FROM opportunity_stage_templates ost
      LEFT JOIN stage_required_actions sra ON ost.id = sra.stage_template_id
      LEFT JOIN stage_required_documents srd ON ost.id = srd.stage_template_id
      WHERE ost.opportunity_type_id = $1
      GROUP BY ost.id, ost.stage_name, ost.stage_order
      ORDER BY ost.stage_order
    `;
    
    const summaryResult = await pool.query(summaryQuery, [typeId]);
    
    let totalActions = 0;
    let totalDocuments = 0;
    
    summaryResult.rows.forEach(row => {
      console.log(`📋 ${row.stage_name} (ordre: ${row.stage_order})`);
      console.log(`   ✅ Actions: ${row.actions_count}`);
      console.log(`   📄 Documents: ${row.documents_count}`);
      totalActions += parseInt(row.actions_count);
      totalDocuments += parseInt(row.documents_count);
    });
    
    console.log('\n📈 TOTAUX:');
    console.log(`   Étapes: ${summaryResult.rows.length}`);
    console.log(`   Actions requises: ${totalActions}`);
    console.log(`   Documents requis: ${totalDocuments}`);
    
    console.log('\n🎉 Type "Vente standard" créé avec succès !');
    console.log('🚀 Vous pouvez maintenant l\'utiliser dans l\'interface de configuration des types d\'opportunité.');
    
  } catch (error) {
    console.error('❌ Erreur lors de la création:', error);
    throw error;
  }
}

// Exécuter la création
if (require.main === module) {
  createVenteStandardType()
    .then(() => {
      console.log('\n✅ Création terminée avec succès !');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
}

module.exports = { createVenteStandardType };








