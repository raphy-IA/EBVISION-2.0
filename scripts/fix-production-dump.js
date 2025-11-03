const fs = require('fs');
const path = require('path');

// Script pour corriger le dump de production
function fixProductionDump() {
  console.log('🔧 Correction du dump de production...\n');
  
  try {
    const dumpFileName = 'backup_production_2025-09-23.sql';
    const dumpFilePath = path.join(__dirname, '..', dumpFileName);
    
    if (!fs.existsSync(dumpFilePath)) {
      console.error(`❌ Fichier non trouvé: ${dumpFileName}`);
      return;
    }
    
    console.log(`📁 Lecture du fichier: ${dumpFileName}`);
    
    // Lire le contenu du fichier
    let fileContent = fs.readFileSync(dumpFilePath, 'utf8');
    console.log(`📏 Taille originale: ${(fileContent.length / 1024 / 1024).toFixed(2)} MB`);
    
    console.log('\n🔧 Application des corrections...');
    
    // 1. Supprimer les paramètres PostgreSQL non supportés
    console.log('   - Suppression des paramètres non supportés...');
    fileContent = fileContent.replace(/SET transaction_timeout = 0;/g, '');
    fileContent = fileContent.replace(/SET statement_timeout = 0;/g, '');
    fileContent = fileContent.replace(/SET lock_timeout = 0;/g, '');
    
    // 2. Supprimer les références à la locale Windows
    console.log('   - Suppression des locales Windows...');
    fileContent = fileContent.replace(/LC_COLLATE = 'French_France\.1252'/g, '');
    fileContent = fileContent.replace(/LC_CTYPE = 'French_France\.1252'/g, '');
    fileContent = fileContent.replace(/LC_COLLATE='French_France\.1252'/g, '');
    fileContent = fileContent.replace(/LC_CTYPE='French_France\.1252'/g, '');
    
    // 3. Supprimer les commandes CREATE DATABASE et \connect
    console.log('   - Suppression des commandes CREATE DATABASE et \\connect...');
    fileContent = fileContent.replace(/CREATE DATABASE .*;/g, '');
    fileContent = fileContent.replace(/\\connect .*/g, '');
    fileContent = fileContent.replace(/\\connect: .*/g, '');
    
    // 4. Supprimer les commandes DROP DATABASE
    console.log('   - Suppression des commandes DROP DATABASE...');
    fileContent = fileContent.replace(/DROP DATABASE .*;/g, '');
    
    // 5. Nettoyer les lignes vides multiples
    console.log('   - Nettoyage des lignes vides...');
    fileContent = fileContent.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // 6. Supprimer les lignes vides au début
    fileContent = fileContent.replace(/^\s*\n+/, '');
    
    // 7. Supprimer les lignes vides à la fin
    fileContent = fileContent.replace(/\n\s*$/, '');
    
    console.log('✅ Corrections appliquées !');
    
    // Créer un fichier de sauvegarde
    const backupFileName = `${dumpFileName}.backup`;
    const backupFilePath = path.join(__dirname, '..', backupFileName);
    fs.copyFileSync(dumpFilePath, backupFilePath);
    console.log(`💾 Sauvegarde créée: ${backupFileName}`);
    
    // Réécrire le fichier corrigé
    fs.writeFileSync(dumpFilePath, fileContent, 'utf8');
    
    const newSize = (fileContent.length / 1024 / 1024).toFixed(2);
    console.log(`📏 Nouvelle taille: ${newSize} MB`);
    
    // Vérifier les corrections
    console.log('\n🔍 Vérification des corrections...');
    
    const hasTransactionTimeout = fileContent.includes('transaction_timeout');
    const hasFrenchLocale = fileContent.includes('French_France.1252');
    const hasCreateDatabase = fileContent.includes('CREATE DATABASE');
    const hasConnect = fileContent.includes('\\connect');
    const hasDropDatabase = fileContent.includes('DROP DATABASE');
    
    console.log(`   - transaction_timeout: ${hasTransactionTimeout ? '❌ Présent' : '✅ Supprimé'}`);
    console.log(`   - French_France.1252: ${hasFrenchLocale ? '❌ Présent' : '✅ Supprimé'}`);
    console.log(`   - CREATE DATABASE: ${hasCreateDatabase ? '❌ Présent' : '✅ Supprimé'}`);
    console.log(`   - \\connect: ${hasConnect ? '❌ Présent' : '✅ Supprimé'}`);
    console.log(`   - DROP DATABASE: ${hasDropDatabase ? '❌ Présent' : '✅ Supprimé'}`);
    
    // Afficher les premières lignes du fichier corrigé
    console.log('\n📄 Aperçu du fichier corrigé (premières 15 lignes):');
    console.log('====================================================');
    const lines = fileContent.split('\n').slice(0, 15);
    lines.forEach((line, index) => {
      console.log(`${(index + 1).toString().padStart(2, ' ')}: ${line}`);
    });
    
    if (fileContent.split('\n').length > 15) {
      console.log('   ...');
    }
    
    // Instructions pour l'import
    console.log('\n📋 INSTRUCTIONS POUR L\'IMPORT EN PRODUCTION:');
    console.log('=============================================');
    console.log('1. Copiez le fichier corrigé sur le serveur de production:');
    console.log(`   scp ${dumpFileName} raphyai82@srv1023879:~/apps/ebvision/importedDB/`);
    console.log('');
    console.log('2. Sur le serveur de production, importez le dump:');
    console.log(`   psql -h localhost -U ebvision_user -d ebvision_db < ${dumpFileName}`);
    console.log('');
    console.log('3. Ou utilisez la commande complète:');
    console.log(`   PGPASSWORD=your_password psql -h localhost -U ebvision_user -d ebvision_db -f ${dumpFileName}`);
    console.log('');
    console.log('4. Vérifiez l\'import:');
    console.log('   psql -h localhost -U ebvision_user -d ebvision_db -c "\\dt"');
    console.log('');
    console.log('5. Redémarrez l\'application:');
    console.log('   cd ~/apps/ebvision && npm start');
    
    console.log('\n🎉 Fichier corrigé avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error.message);
    throw error;
  }
}

// Exécuter le script
if (require.main === module) {
  fixProductionDump();
}

module.exports = { fixProductionDump };














