const fs = require('fs');
const { pool } = require('../src/utils/database');

// Utiliser la configuration de production existante
const config = require('../config.production.js');
const productionConfig = {
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

async function syncOpportunityTypesToProduction() {
  console.log('🚀 Synchronisation des types d\'opportunité vers la production...\n');
  
  // 1. Charger la configuration locale
  const configFile = 'scripts/opportunity-types-config-local.json';
  if (!fs.existsSync(configFile)) {
    throw new Error(`Fichier de configuration non trouvé: ${configFile}`);
  }
  
  const localConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  console.log(`📁 Configuration locale chargée: ${localConfig.length} types d'opportunité\n`);
  
  // 2. Se connecter à la production
  const { Pool } = require('pg');
  const prodPool = new Pool(productionConfig);
  
  try {
    console.log('🔗 Connexion à la base de données de production...');
    const prodClient = await prodPool.connect();
    console.log('✅ Connexion à la production réussie !\n');
    
    // 3. Pour chaque type d'opportunité local
    for (const config of localConfig) {
      const type = config.type;
      const stages = config.stages;
      
      // Gérer le cas où le nom est null
      const typeName = type.nom || type.name || `Type_${type.id}`;
      
      console.log(`🔄 Synchronisation du type: ${typeName}`);
      
      const existingTypeQuery = `
        SELECT id FROM opportunity_types WHERE nom = $1 OR name = $1
      `;
      const existingTypeResult = await prodClient.query(existingTypeQuery, [typeName]);
      
      let typeId;
      if (existingTypeResult.rows.length > 0) {
        // Type existe, utiliser son ID
        typeId = existingTypeResult.rows[0].id;
        console.log(`  ✅ Type existant trouvé (ID: ${typeId})`);
      } else {
        // Créer le type
        const createTypeQuery = `
          INSERT INTO opportunity_types (nom, name, code, description, couleur, default_probability, default_duration_days, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
        `;
        const createTypeResult = await prodClient.query(createTypeQuery, [
          typeName,
          typeName, // Utiliser le même nom pour les deux champs
          type.code,
          type.description,
          type.couleur,
          type.default_probability,
          type.default_duration_days,
          new Date(),
          new Date()
        ]);
        typeId = createTypeResult.rows[0].id;
        console.log(`  ✅ Type créé (ID: ${typeId})`);
      }
      
      // 4. Synchroniser les étapes
      console.log(`  📋 Synchronisation de ${stages.length} étapes...`);
      
      for (const stage of stages) {
        // Vérifier si l'étape existe
        const existingStageQuery = `
          SELECT id FROM opportunity_stage_templates 
          WHERE opportunity_type_id = $1 AND stage_name = $2
        `;
        const existingStageResult = await prodClient.query(existingStageQuery, [typeId, stage.stage_name]);
        
        let stageId;
        if (existingStageResult.rows.length > 0) {
          stageId = existingStageResult.rows[0].id;
          console.log(`    ✅ Étape existante: ${stage.stage_name}`);
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
          const createStageResult = await prodClient.query(createStageQuery, [
            typeId,
            stage.stage_name,
            stage.stage_order,
            stage.description,
            stage.min_duration_days,
            stage.max_duration_days,
            stage.is_mandatory,
            stage.validation_required,
            new Date(),
            new Date()
          ]);
          stageId = createStageResult.rows[0].id;
          console.log(`    ✅ Étape créée: ${stage.stage_name}`);
        }
        
        // 5. Synchroniser les actions requises
        console.log(`      🔧 Synchronisation de ${stage.requiredActions.length} actions requises...`);
        
        for (const action of stage.requiredActions) {
          // Vérifier si l'action existe
          const existingActionQuery = `
            SELECT id FROM stage_required_actions 
            WHERE stage_template_id = $1 AND action_type = $2
          `;
          const existingActionResult = await prodClient.query(existingActionQuery, [stageId, action.action_type]);
          
          if (existingActionResult.rows.length === 0) {
            // Créer l'action
            const createActionQuery = `
              INSERT INTO stage_required_actions (stage_template_id, action_type, is_mandatory, validation_order, created_at)
              VALUES ($1, $2, $3, $4, $5)
            `;
            await prodClient.query(createActionQuery, [
              stageId,
              action.action_type,
              action.is_mandatory,
              action.validation_order,
              new Date()
            ]);
            console.log(`        ✅ Action ajoutée: ${action.action_type}`);
          } else {
            console.log(`        ⏭️  Action existante: ${action.action_type}`);
          }
        }
        
        // 6. Synchroniser les documents requis
        console.log(`      📄 Synchronisation de ${stage.requiredDocuments.length} documents requis...`);
        
        for (const document of stage.requiredDocuments) {
          // Vérifier si le document existe
          const existingDocQuery = `
            SELECT id FROM stage_required_documents 
            WHERE stage_template_id = $1 AND document_type = $2
          `;
          const existingDocResult = await prodClient.query(existingDocQuery, [stageId, document.document_type]);
          
          if (existingDocResult.rows.length === 0) {
            // Créer le document
            const createDocQuery = `
              INSERT INTO stage_required_documents (stage_template_id, document_type, is_mandatory, created_at)
              VALUES ($1, $2, $3, $4)
            `;
            await prodClient.query(createDocQuery, [
              stageId,
              document.document_type,
              document.is_mandatory,
              new Date()
            ]);
            console.log(`        ✅ Document ajouté: ${document.document_type}`);
          } else {
            console.log(`        ⏭️  Document existant: ${document.document_type}`);
          }
        }
      }
      
      console.log(`  ✅ Type "${typeName}" synchronisé avec succès\n`);
    }
    
    console.log('🎉 Synchronisation terminée avec succès !');
    
    // 7. Afficher un résumé final
    const summaryQuery = `
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
    
    const summaryResult = await prodClient.query(summaryQuery);
    
    console.log('\n📊 RÉSUMÉ DE LA PRODUCTION APRÈS SYNCHRONISATION:');
    console.log('================================================');
    
    summaryResult.rows.forEach(row => {
      console.log(`🏷️  ${row.nom}: ${row.stages_count} étapes, ${row.actions_count} actions, ${row.documents_count} documents`);
    });
    
    prodClient.release();
    
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error);
    throw error;
  } finally {
    await prodPool.end();
  }
}

// Exécuter la synchronisation
if (require.main === module) {
  syncOpportunityTypesToProduction()
    .then(() => {
      console.log('\n✅ Synchronisation terminée avec succès !');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
}

module.exports = { syncOpportunityTypesToProduction };
