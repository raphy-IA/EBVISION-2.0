const fs = require('fs');
const path = require('path');

// Script pour vérifier que le dump est prêt pour l'import
function verifyDump() {
  console.log('🔍 Vérification du dump de production...\n');
  
  try {
    const dumpFileName = 'backup_production_2025-09-23.sql';
    const dumpFilePath = path.join(__dirname, '..', dumpFileName);
    
    if (!fs.existsSync(dumpFilePath)) {
      console.error(`❌ Fichier non trouvé: ${dumpFileName}`);
      return;
    }
    
    console.log(`📁 Vérification du fichier: ${dumpFileName}`);
    
    // Lire le contenu du fichier
    const fileContent = fs.readFileSync(dumpFilePath, 'utf8');
    const fileSize = (fileContent.length / 1024 / 1024).toFixed(2);
    
    console.log(`📏 Taille: ${fileSize} MB`);
    console.log(`📄 Lignes: ${fileContent.split('\n').length}`);
    
    // Vérifications
    console.log('\n🔍 Vérifications de compatibilité:');
    
    const checks = [
      {
        name: 'transaction_timeout',
        pattern: /transaction_timeout/,
        shouldBeAbsent: true,
        description: 'Paramètre non supporté'
      },
      {
        name: 'French_France.1252',
        pattern: /French_France\.1252/,
        shouldBeAbsent: true,
        description: 'Locale Windows'
      },
      {
        name: 'CREATE DATABASE',
        pattern: /CREATE DATABASE/,
        shouldBeAbsent: true,
        description: 'Commande de création de base'
      },
      {
        name: '\\connect',
        pattern: /\\connect/,
        shouldBeAbsent: true,
        description: 'Commande de connexion'
      },
      {
        name: 'DROP DATABASE',
        pattern: /DROP DATABASE/,
        shouldBeAbsent: true,
        description: 'Commande de suppression de base'
      },
      {
        name: 'eb_vision_2_0',
        pattern: /eb_vision_2_0/,
        shouldBeAbsent: true,
        description: 'Nom de base local'
      },
      {
        name: 'UTF8 encoding',
        pattern: /client_encoding = 'UTF8'/,
        shouldBeAbsent: false,
        description: 'Encodage UTF-8'
      },
      {
        name: 'PostgreSQL dump header',
        pattern: /PostgreSQL database dump/,
        shouldBeAbsent: false,
        description: 'En-tête de dump'
      },
      {
        name: 'Dump complete',
        pattern: /PostgreSQL database dump complete/,
        shouldBeAbsent: false,
        description: 'Fin de dump'
      }
    ];
    
    let allChecksPassed = true;
    
    checks.forEach(check => {
      const found = check.pattern.test(fileContent);
      const status = check.shouldBeAbsent ? !found : found;
      const icon = status ? '✅' : '❌';
      const result = status ? 'OK' : 'PROBLÈME';
      
      console.log(`   ${icon} ${check.name}: ${result} - ${check.description}`);
      
      if (!status) {
        allChecksPassed = false;
      }
    });
    
    // Vérifier les paramètres SET
    console.log('\n🔧 Vérification des paramètres SET:');
    const setLines = fileContent.split('\n').filter(line => line.startsWith('SET '));
    console.log(`   📊 Nombre de paramètres SET: ${setLines.length}`);
    
    setLines.forEach((line, index) => {
      if (index < 10) { // Afficher les 10 premiers
        console.log(`   ${(index + 1).toString().padStart(2, ' ')}: ${line}`);
      }
    });
    
    if (setLines.length > 10) {
      console.log(`   ... et ${setLines.length - 10} autres`);
    }
    
    // Vérifier la structure du fichier
    console.log('\n📋 Structure du fichier:');
    const hasHeader = fileContent.includes('-- PostgreSQL database dump');
    const hasFooter = fileContent.includes('-- PostgreSQL database dump complete');
    const hasTables = fileContent.includes('CREATE TABLE');
    const hasData = fileContent.includes('COPY public.');
    const hasConstraints = fileContent.includes('ADD CONSTRAINT');
    
    console.log(`   ${hasHeader ? '✅' : '❌'} En-tête de dump`);
    console.log(`   ${hasTables ? '✅' : '❌'} Tables (CREATE TABLE)`);
    console.log(`   ${hasData ? '✅' : '❌'} Données (COPY)`);
    console.log(`   ${hasConstraints ? '✅' : '❌'} Contraintes (ADD CONSTRAINT)`);
    console.log(`   ${hasFooter ? '✅' : '❌'} Fin de dump`);
    
    // Résumé final
    console.log('\n📊 RÉSUMÉ DE LA VÉRIFICATION:');
    console.log('==============================');
    
    if (allChecksPassed && hasHeader && hasFooter && hasTables) {
      console.log('🎉 Le dump est PRÊT pour l\'import en production !');
      console.log('');
      console.log('📋 Instructions d\'import:');
      console.log('1. Copiez le fichier sur le serveur:');
      console.log(`   scp ${dumpFileName} raphyai82@srv1023879:~/apps/ebvision/importedDB/`);
      console.log('');
      console.log('2. Importez sur le serveur:');
      console.log(`   psql -h localhost -U ebvision_user -d ebvision_db < ${dumpFileName}`);
    } else {
      console.log('⚠️  Le dump nécessite des corrections supplémentaires.');
      if (!allChecksPassed) {
        console.log('   - Certaines vérifications ont échoué');
      }
      if (!hasHeader || !hasFooter) {
        console.log('   - Structure de fichier incomplète');
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
    throw error;
  }
}

// Exécuter le script
if (require.main === module) {
  verifyDump();
}

module.exports = { verifyDump };






