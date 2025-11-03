const { pool } = require('../src/utils/database');

// Script pour corriger tous les noms de types d'opportunité
async function fixAllOpportunityTypeNames() {
  console.log('🔧 Correction de tous les noms de types d\'opportunité...\n');
  
  try {
    // 1. Récupérer tous les types d'opportunité
    const typesQuery = `
      SELECT id, nom, name, code, description 
      FROM opportunity_types 
      ORDER BY created_at
    `;
    const typesResult = await pool.query(typesQuery);
    const types = typesResult.rows;
    
    console.log(`📊 ${types.length} types d'opportunité trouvés\n`);
    
    // 2. Analyser et corriger chaque type
    let correctedCount = 0;
    
    for (const type of types) {
      console.log(`🔍 Analyse du type ID: ${type.id}`);
      console.log(`   Nom actuel: "${type.nom}"`);
      console.log(`   Name actuel: "${type.name}"`);
      console.log(`   Code: "${type.code}"`);
      
      let newName = null;
      let needsUpdate = false;
      
      // Déterminer le nouveau nom basé sur le code ou la description
      if (type.code === 'VENTE_STD') {
        newName = 'Vente standard';
        needsUpdate = true;
      } else if (type.code === 'AUDIT') {
        newName = 'Audit';
        needsUpdate = true;
      } else if (type.code === 'CONSEIL') {
        newName = 'Conseil';
        needsUpdate = true;
      } else if (type.code === 'CONSULTING') {
        newName = 'Consulting';
        needsUpdate = true;
      } else if (type.code === 'EXPERTISE') {
        newName = 'Expertise';
        needsUpdate = true;
      } else if (type.code === 'FORMATION') {
        newName = 'Formation';
        needsUpdate = true;
      } else if (type.code === 'IMPLEMENTATION') {
        newName = 'Implementation';
        needsUpdate = true;
      } else if (type.code === 'TT3') {
        newName = 'Type Test 3';
        needsUpdate = true;
      } else if (type.nom && type.nom.startsWith('Type_')) {
        // Nom généré automatiquement, utiliser le code ou créer un nom basé sur la description
        if (type.code) {
          newName = type.code.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
        } else if (type.description) {
          newName = type.description.split(' ')[0]; // Prendre le premier mot de la description
        } else {
          newName = `Type ${type.id.substring(0, 8)}`;
        }
        needsUpdate = true;
      } else if (!type.nom || type.nom === 'null') {
        // Nom null ou vide
        if (type.code) {
          newName = type.code.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
        } else {
          newName = `Type ${type.id.substring(0, 8)}`;
        }
        needsUpdate = true;
      }
      
      if (needsUpdate && newName) {
        // Mettre à jour le nom
        const updateQuery = `
          UPDATE opportunity_types 
          SET nom = $1, name = $1, updated_at = CURRENT_TIMESTAMP 
          WHERE id = $2
        `;
        
        await pool.query(updateQuery, [newName, type.id]);
        console.log(`   ✅ Nom corrigé vers: "${newName}"`);
        correctedCount++;
      } else {
        console.log(`   ⏭️  Nom correct, pas de modification nécessaire`);
      }
      
      console.log('');
    }
    
    // 3. Afficher le résumé final
    console.log('📊 RÉSUMÉ DE LA CORRECTION:');
    console.log('============================');
    console.log(`   Types analysés: ${types.length}`);
    console.log(`   Types corrigés: ${correctedCount}`);
    
    // 4. Afficher tous les types après correction
    const finalTypesQuery = `
      SELECT nom, code, description
      FROM opportunity_types 
      ORDER BY nom
    `;
    const finalTypesResult = await pool.query(finalTypesQuery);
    
    console.log('\n📋 TYPES D\'OPPORTUNITÉ APRÈS CORRECTION:');
    console.log('==========================================');
    
    finalTypesResult.rows.forEach(type => {
      console.log(`🏷️  ${type.nom} (${type.code || 'Sans code'})`);
      if (type.description) {
        console.log(`   📝 ${type.description}`);
      }
    });
    
    console.log('\n🎉 Correction terminée avec succès !');
    console.log('🔄 Rechargez la page pour voir les changements.');
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
    throw error;
  }
}

// Exécuter la correction
if (require.main === module) {
  fixAllOpportunityTypeNames()
    .then(() => {
      console.log('\n✅ Correction terminée !');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
}

module.exports = { fixAllOpportunityTypeNames };
















