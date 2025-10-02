const fs = require('fs');

// Script pour corriger les noms null avant la synchronisation
function fixNullNamesBeforeSync() {
  console.log('🔧 Correction des noms null avant synchronisation...\n');
  
  const configFile = 'scripts/opportunity-types-config-local.json';
  if (!fs.existsSync(configFile)) {
    console.error('❌ Fichier de configuration non trouvé:', configFile);
    return;
  }
  
  const localConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  console.log(`📁 Configuration chargée: ${localConfig.length} types d'opportunité\n`);
  
  let fixedCount = 0;
  
  // Corriger les noms null
  localConfig.forEach(config => {
    const type = config.type;
    
    if (!type.nom && !type.name) {
      // Générer un nom basé sur le code ou l'ID
      const newName = type.code || `Type_${type.id}`;
      type.nom = newName;
      type.name = newName;
      fixedCount++;
      
      console.log(`🔧 Type corrigé: ID ${type.id} -> Nom: "${newName}"`);
    } else if (!type.nom && type.name) {
      type.nom = type.name;
      fixedCount++;
      console.log(`🔧 Type corrigé: ID ${type.id} -> Nom: "${type.name}"`);
    } else if (type.nom && !type.name) {
      type.name = type.nom;
      fixedCount++;
      console.log(`🔧 Type corrigé: ID ${type.id} -> Name: "${type.nom}"`);
    }
  });
  
  if (fixedCount > 0) {
    // Sauvegarder la configuration corrigée
    fs.writeFileSync(configFile, JSON.stringify(localConfig, null, 2));
    console.log(`\n✅ ${fixedCount} types corrigés et sauvegardés`);
  } else {
    console.log('\n✅ Aucune correction nécessaire');
  }
  
  console.log('\n📊 RÉSUMÉ DES TYPES:');
  console.log('===================');
  
  localConfig.forEach(config => {
    const type = config.type;
    const name = type.nom || type.name || 'SANS_NOM';
    const stagesCount = config.stages.length;
    const actionsCount = config.stages.reduce((sum, stage) => sum + stage.requiredActions.length, 0);
    const documentsCount = config.stages.reduce((sum, stage) => sum + stage.requiredDocuments.length, 0);
    
    console.log(`🏷️  ${name}: ${stagesCount} étapes, ${actionsCount} actions, ${documentsCount} documents`);
  });
  
  console.log('\n🚀 Prêt pour la synchronisation !');
}

if (require.main === module) {
  fixNullNamesBeforeSync();
}

module.exports = { fixNullNamesBeforeSync };





