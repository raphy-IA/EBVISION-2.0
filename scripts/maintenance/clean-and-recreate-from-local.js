const fs = require('fs');
const { pool } = require('../src/utils/database');

// Script pour nettoyer et recréer fidèlement à partir de la configuration locale
async function cleanAndRecreateFromLocal() {
  console.log('🧹 Nettoyage et recréation fidèle à partir de la configuration locale...\n');
  
  try {
    // 1. Charger la configuration locale
    const configFile = 'scripts/opportunity-types-config-local.json';
    if (!fs.existsSync(configFile)) {
      throw new Error(`Fichier de configuration non trouvé: ${configFile}`);
    }
    
    const localConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    console.log(`📁 Configuration locale chargée: ${localConfig.length} types d'opportunité\n`);
    
    // 2. Nettoyer la base de données de production
    console.log('🧹 Nettoyage de la base de données de production...');
    
    // Supprimer toutes les actions requises
    await pool.query('DELETE FROM stage_required_actions');
    console.log('  ✅ Actions requises supprimées');
    
    // Supprimer tous les documents requis
    await pool.query('DELETE FROM stage_required_documents');
    console.log('  ✅ Documents requis supprimés');
    
    // Supprimer tous les templates d'étapes
    await pool.query('DELETE FROM opportunity_stage_templates');
    console.log('  ✅ Templates d\'étapes supprimés');
    
    // Supprimer tous les types d'opportunité
    await pool.query('DELETE FROM opportunity_types');
    console.log('  ✅ Types d\'opportunité supprimés');
    
    console.log('\n✅ Base de données nettoyée\n');
    
    // 3. Recréer fidèlement à partir de la configuration locale
    console.log('🔄 Recréation fidèle à partir de la configuration locale...\n');
    
    for (const config of localConfig) {
      const type = config.type;
      const stages = config.stages;
      
      // Gérer le nom (éviter les noms null)
      const typeName = type.nom || type.name || `Type_${type.id}`;
      
      console.log(`🔄 Création du type: ${typeName}`);
      
      // Créer le type d'opportunité
      const createTypeQuery = `
        INSERT INTO opportunity_types (id, nom, name, code, description, couleur, default_probability, default_duration_days, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `;
      const createTypeResult = await pool.query(createTypeQuery, [
        type.id, // Utiliser l'ID original
        typeName,
        typeName,
        type.code,
        type.description,
        type.couleur,
        type.default_probability,
        type.default_duration_days,
        type.created_at || new Date(),
        type.updated_at || new Date()
      ]);
      const typeId = createTypeResult.rows[0].id;
      
      console.log(`  ✅ Type créé (ID: ${typeId})`);
      
      // Créer les étapes exactement comme en local
      console.log(`  📋 Création de ${stages.length} étapes...`);
      
      for (const stage of stages) {
        // Créer l'étape avec l'ID original
        const createStageQuery = `
          INSERT INTO opportunity_stage_templates (
            id, opportunity_type_id, stage_name, stage_order, description, 
            min_duration_days, max_duration_days, is_mandatory, validation_required, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `;
        const createStageResult = await pool.query(createStageQuery, [
          stage.id, // Utiliser l'ID original
          typeId,
          stage.stage_name,
          stage.stage_order,
          stage.description,
          stage.min_duration_days,
          stage.max_duration_days,
          stage.is_mandatory,
          stage.validation_required,
          stage.created_at || new Date(),
          stage.updated_at || new Date()
        ]);
        const stageId = createStageResult.rows[0].id;
        
        console.log(`    ✅ Étape créée: ${stage.stage_name}`);
        
        // Créer les actions requises exactement comme en local
        for (const action of stage.requiredActions) {
          const createActionQuery = `
            INSERT INTO stage_required_actions (id, stage_template_id, action_type, is_mandatory, validation_order, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
          `;
          await pool.query(createActionQuery, [
            action.id, // Utiliser l'ID original
            stageId,
            action.action_type,
            action.is_mandatory,
            action.validation_order,
            action.created_at || new Date()
          ]);
        }
        
        if (stage.requiredActions.length > 0) {
          console.log(`      ✅ ${stage.requiredActions.length} actions requises créées`);
        }
        
        // Créer les documents requis exactement comme en local
        for (const document of stage.requiredDocuments) {
          const createDocQuery = `
            INSERT INTO stage_required_documents (id, stage_template_id, document_type, is_mandatory, created_at)
            VALUES ($1, $2, $3, $4, $5)
          `;
          await pool.query(createDocQuery, [
            document.id, // Utiliser l'ID original
            stageId,
            document.document_type,
            document.is_mandatory,
            document.created_at || new Date()
          ]);
        }
        
        if (stage.requiredDocuments.length > 0) {
          console.log(`      ✅ ${stage.requiredDocuments.length} documents requis créés`);
        }
      }
      
      console.log(`  ✅ Type "${typeName}" recréé fidèlement\n`);
    }
    
    // 4. Afficher le résumé final
    console.log('📊 RÉSUMÉ FINAL:');
    console.log('================');
    
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
    
    const summaryResult = await pool.query(summaryQuery);
    
    let totalStages = 0;
    let totalActions = 0;
    let totalDocuments = 0;
    
    summaryResult.rows.forEach(row => {
      console.log(`🏷️  ${row.nom}: ${row.stages_count} étapes, ${row.actions_count} actions, ${row.documents_count} documents`);
      totalStages += parseInt(row.stages_count);
      totalActions += parseInt(row.actions_count);
      totalDocuments += parseInt(row.documents_count);
    });
    
    console.log('\n📈 TOTAUX:');
    console.log(`   Types d'opportunité: ${summaryResult.rows.length}`);
    console.log(`   Étapes: ${totalStages}`);
    console.log(`   Actions requises: ${totalActions}`);
    console.log(`   Documents requis: ${totalDocuments}`);
    
    console.log('\n🎉 Recréation fidèle terminée avec succès !');
    console.log('🔄 Rechargez la page pour voir la configuration exacte de votre environnement local.');
    
  } catch (error) {
    console.error('❌ Erreur lors de la recréation:', error);
    throw error;
  }
}

// Exécuter la recréation
if (require.main === module) {
  cleanAndRecreateFromLocal()
    .then(() => {
      console.log('\n✅ Recréation terminée avec succès !');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
}

module.exports = { cleanAndRecreateFromLocal };
















