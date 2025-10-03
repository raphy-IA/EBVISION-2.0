const { pool } = require('../src/utils/database');

// Script pour corriger les problèmes de cohérence de la base de données
async function fixDatabaseConsistency() {
  console.log('🔧 Correction des problèmes de cohérence de la base de données...\n');
  
  try {
    let fixesApplied = 0;
    
    // 1. Corriger le type "SANS_NOM" (Vente standard)
    console.log('🏷️  CORRECTION DU TYPE "SANS_NOM":');
    console.log('===================================');
    
    const problematicTypeQuery = `
      SELECT id, nom, name, code, description, couleur, default_probability, default_duration_days
      FROM opportunity_types 
      WHERE nom IS NULL OR name IS NULL OR code IS NULL
    `;
    const problematicTypeResult = await pool.query(problematicTypeQuery);
    
    if (problematicTypeResult.rows.length > 0) {
      for (const type of problematicTypeResult.rows) {
        console.log(`🔍 Type problématique trouvé (ID: ${type.id})`);
        console.log(`   nom: ${type.nom}`);
        console.log(`   name: ${type.name}`);
        console.log(`   code: ${type.code}`);
        
        // Déterminer le nom correct
        let correctName = type.name || type.nom || 'Vente standard';
        let correctCode = type.code || 'VENTE_STD';
        
        // Si c'est le type "Vente standard", utiliser les bonnes valeurs
        if (type.name === 'Vente standard' || correctName === 'Vente standard') {
          correctName = 'Vente standard';
          correctCode = 'VENTE_STD';
        }
        
        console.log(`   → Correction: nom="${correctName}", code="${correctCode}"`);
        
        // Mettre à jour le type
        const updateTypeQuery = `
          UPDATE opportunity_types 
          SET nom = $1, name = $2, code = $3, updated_at = $4
          WHERE id = $5
        `;
        await pool.query(updateTypeQuery, [
          correctName,
          correctName,
          correctCode,
          new Date(),
          type.id
        ]);
        
        console.log(`   ✅ Type corrigé avec succès\n`);
        fixesApplied++;
      }
    } else {
      console.log('✅ Aucun type problématique trouvé\n');
    }
    
    // 2. Corriger les étapes orphelines
    console.log('📋 CORRECTION DES ÉTAPES ORPHELINES:');
    console.log('====================================');
    
    const orphanStagesQuery = `
      SELECT ost.id, ost.stage_name, ost.stage_order, ost.opportunity_type_id
      FROM opportunity_stage_templates ost
      LEFT JOIN opportunity_types ot ON ost.opportunity_type_id = ot.id
      WHERE ot.id IS NULL
      ORDER BY ost.stage_order
    `;
    const orphanStagesResult = await pool.query(orphanStagesQuery);
    
    if (orphanStagesResult.rows.length > 0) {
      console.log(`🔍 ${orphanStagesResult.rows.length} étapes orphelines trouvées`);
      
      // Essayer de trouver le type "Vente standard" pour les réattribuer
      const venteStandardQuery = `
        SELECT id FROM opportunity_types 
        WHERE nom = 'Vente standard' OR name = 'Vente standard'
        LIMIT 1
      `;
      const venteStandardResult = await pool.query(venteStandardQuery);
      
      if (venteStandardResult.rows.length > 0) {
        const venteStandardId = venteStandardResult.rows[0].id;
        console.log(`   → Réattribution au type "Vente standard" (ID: ${venteStandardId})`);
        
        for (const stage of orphanStagesResult.rows) {
          console.log(`   📋 Étape: ${stage.stage_name} (ordre: ${stage.stage_order})`);
          
          // Mettre à jour l'étape pour l'associer au type "Vente standard"
          const updateStageQuery = `
            UPDATE opportunity_stage_templates 
            SET opportunity_type_id = $1, updated_at = $2
            WHERE id = $3
          `;
          await pool.query(updateStageQuery, [
            venteStandardId,
            new Date(),
            stage.id
          ]);
          
          console.log(`   ✅ Étape réattribuée avec succès`);
        }
        
        fixesApplied++;
        console.log(`\n✅ ${orphanStagesResult.rows.length} étapes réattribuées au type "Vente standard"\n`);
      } else {
        console.log('   ⚠️  Type "Vente standard" non trouvé, création nécessaire...');
        
        // Créer le type "Vente standard" s'il n'existe pas
        const createVenteStandardQuery = `
          INSERT INTO opportunity_types (id, nom, name, code, description, couleur, default_probability, default_duration_days, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id
        `;
        const venteStandardId = '550e8400-e29b-41d4-a716-446655440000'; // UUID fixe pour éviter les doublons
        
        await pool.query(createVenteStandardQuery, [
          venteStandardId,
          'Vente standard',
          'Vente standard',
          'VENTE_STD',
          'Processus de vente standard',
          '#28a745',
          60,
          30,
          new Date(),
          new Date()
        ]);
        
        console.log(`   ✅ Type "Vente standard" créé (ID: ${venteStandardId})`);
        
        // Réattribuer les étapes orphelines
        for (const stage of orphanStagesResult.rows) {
          console.log(`   📋 Étape: ${stage.stage_name} (ordre: ${stage.stage_order})`);
          
          const updateStageQuery = `
            UPDATE opportunity_stage_templates 
            SET opportunity_type_id = $1, updated_at = $2
            WHERE id = $3
          `;
          await pool.query(updateStageQuery, [
            venteStandardId,
            new Date(),
            stage.id
          ]);
          
          console.log(`   ✅ Étape réattribuée avec succès`);
        }
        
        fixesApplied++;
        console.log(`\n✅ ${orphanStagesResult.rows.length} étapes réattribuées au nouveau type "Vente standard"\n`);
      }
    } else {
      console.log('✅ Aucune étape orpheline trouvée\n');
    }
    
    // 3. Vérifier et corriger les incohérences nom/name
    console.log('🔄 VÉRIFICATION DES INCOHÉRENCES NOM/NAME:');
    console.log('==========================================');
    
    const inconsistentTypesQuery = `
      SELECT id, nom, name
      FROM opportunity_types 
      WHERE nom IS DISTINCT FROM name
    `;
    const inconsistentTypesResult = await pool.query(inconsistentTypesQuery);
    
    if (inconsistentTypesResult.rows.length > 0) {
      console.log(`🔍 ${inconsistentTypesResult.rows.length} types avec incohérence nom/name trouvés`);
      
      for (const type of inconsistentTypesResult.rows) {
        console.log(`   🏷️  Type (ID: ${type.id})`);
        console.log(`      nom: "${type.nom}"`);
        console.log(`      name: "${type.name}"`);
        
        // Utiliser le nom non-null comme référence
        const correctName = type.nom || type.name;
        
        if (correctName) {
          const updateQuery = `
            UPDATE opportunity_types 
            SET nom = $1, name = $2, updated_at = $3
            WHERE id = $4
          `;
          await pool.query(updateQuery, [
            correctName,
            correctName,
            new Date(),
            type.id
          ]);
          
          console.log(`      → Corrigé: "${correctName}"`);
          fixesApplied++;
        }
      }
      console.log('');
    } else {
      console.log('✅ Aucune incohérence nom/name trouvée\n');
    }
    
    // 4. Nettoyer les codes vides ou invalides
    console.log('🧹 NETTOYAGE DES CODES INVALIDES:');
    console.log('=================================');
    
    const invalidCodesQuery = `
      SELECT id, nom, code
      FROM opportunity_types 
      WHERE code IS NULL OR code = '' OR code = 'Sans code'
    `;
    const invalidCodesResult = await pool.query(invalidCodesQuery);
    
    if (invalidCodesResult.rows.length > 0) {
      console.log(`🔍 ${invalidCodesResult.rows.length} types avec codes invalides trouvés`);
      
      for (const type of invalidCodesResult.rows) {
        console.log(`   🏷️  Type: ${type.nom} (ID: ${type.id})`);
        console.log(`      Code actuel: "${type.code}"`);
        
        // Générer un code basé sur le nom
        let newCode = type.nom
          ? type.nom.toUpperCase()
              .replace(/[^A-Z0-9]/g, '_')
              .replace(/_+/g, '_')
              .replace(/^_|_$/g, '')
              .substring(0, 10)
          : `TYPE_${type.id.substring(0, 8).toUpperCase()}`;
        
        // Éviter les codes trop courts
        if (newCode.length < 3) {
          newCode = `${newCode}_${type.id.substring(0, 4).toUpperCase()}`;
        }
        
        console.log(`      → Nouveau code: "${newCode}"`);
        
        const updateCodeQuery = `
          UPDATE opportunity_types 
          SET code = $1, updated_at = $2
          WHERE id = $3
        `;
        await pool.query(updateCodeQuery, [
          newCode,
          new Date(),
          type.id
        ]);
        
        console.log(`      ✅ Code mis à jour`);
        fixesApplied++;
      }
      console.log('');
    } else {
      console.log('✅ Aucun code invalide trouvé\n');
    }
    
    // 5. Résumé des corrections
    console.log('📊 RÉSUMÉ DES CORRECTIONS:');
    console.log('==========================');
    console.log(`   Corrections appliquées: ${fixesApplied}`);
    
    if (fixesApplied > 0) {
      console.log('\n🎉 Corrections terminées avec succès !');
      console.log('   Exécutez le script de vérification pour confirmer les corrections.');
    } else {
      console.log('\n✅ Aucune correction nécessaire - Base de données déjà cohérente !');
    }
    
    // 6. Vérification rapide post-correction
    console.log('\n🔍 VÉRIFICATION POST-CORRECTION:');
    console.log('=================================');
    
    const quickCheckQuery = `
      SELECT 
        COUNT(*) as total_types,
        COUNT(CASE WHEN nom IS NULL OR name IS NULL THEN 1 END) as null_names,
        COUNT(CASE WHEN code IS NULL OR code = '' THEN 1 END) as null_codes,
        COUNT(CASE WHEN nom IS DISTINCT FROM name THEN 1 END) as inconsistent_names
      FROM opportunity_types
    `;
    const quickCheckResult = await pool.query(quickCheckQuery);
    const stats = quickCheckResult.rows[0];
    
    console.log(`   Types d'opportunité: ${stats.total_types}`);
    console.log(`   Noms manquants: ${stats.null_names}`);
    console.log(`   Codes manquants: ${stats.null_codes}`);
    console.log(`   Incohérences nom/name: ${stats.inconsistent_names}`);
    
    const orphanStagesCheckQuery = `
      SELECT COUNT(*) as count
      FROM opportunity_stage_templates ost
      LEFT JOIN opportunity_types ot ON ost.opportunity_type_id = ot.id
      WHERE ot.id IS NULL
    `;
    const orphanStagesCheckResult = await pool.query(orphanStagesCheckQuery);
    const orphanStagesCount = parseInt(orphanStagesCheckResult.rows[0].count);
    
    console.log(`   Étapes orphelines: ${orphanStagesCount}`);
    
    if (stats.null_names == 0 && stats.null_codes == 0 && stats.inconsistent_names == 0 && orphanStagesCount == 0) {
      console.log('\n🎉 Base de données entièrement cohérente !');
    } else {
      console.log('\n⚠️  Certains problèmes persistent. Vérifiez manuellement si nécessaire.');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
    throw error;
  }
}

// Exécuter les corrections
if (require.main === module) {
  fixDatabaseConsistency()
    .then(() => {
      console.log('\n✅ Correction terminée !');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
}

module.exports = { fixDatabaseConsistency };




