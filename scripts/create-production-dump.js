const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Charger la configuration de l'application
require('dotenv').config();

// Script pour créer un dump compatible avec la production Linux
async function createProductionDump() {
  console.log('🗄️  Création du dump compatible production Linux...\n');
  
  try {
    // Utiliser la même configuration que l'application
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'eb_vision_2_0',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    };
    
    console.log('📋 Configuration de la base de données (depuis l\'application):');
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   Port: ${dbConfig.port}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   User: ${dbConfig.user}`);
    console.log(`   Password: ${dbConfig.password ? '***' : 'Non défini'}\n`);
    
    // Nom du fichier de dump avec timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const dumpFileName = `backup_production_${timestamp}.sql`;
    const dumpFilePath = path.join(__dirname, '..', dumpFileName);
    
    console.log(`📁 Fichier de dump: ${dumpFileName}`);
    console.log(`📁 Chemin complet: ${dumpFilePath}\n`);
    
    // Commande pg_dump optimisée pour la production Linux
    const pgDumpCommand = [
      'pg_dump',
      `--host=${dbConfig.host}`,
      `--port=${dbConfig.port}`,
      `--username=${dbConfig.user}`,
      `--dbname=${dbConfig.database}`,
      '--verbose',
      '--clean',                    // Nettoyer avant de créer
      '--if-exists',               // Utiliser IF EXISTS
      '--no-owner',                // Pas de propriétaire
      '--no-privileges',           // Pas de privilèges
      '--no-tablespaces',          // Pas de tablespaces
      '--encoding=UTF8',           // Encodage UTF-8
      '--format=plain',            // Format texte
      `--file="${dumpFilePath}"`
    ].join(' ');
    
    console.log('🔧 Commande pg_dump (optimisée pour production):');
    console.log(`   ${pgDumpCommand.replace(dbConfig.password, '***')}\n`);
    
    // Variables d'environnement pour pg_dump
    const env = {
      ...process.env,
      PGPASSWORD: dbConfig.password
    };
    
    console.log('⏳ Création du dump en cours...');
    
    // Exécuter pg_dump
    await new Promise((resolve, reject) => {
      const child = exec(pgDumpCommand, { env }, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Erreur lors de la création du dump:', error.message);
          reject(error);
          return;
        }
        
        if (stderr) {
          console.log('📝 Logs pg_dump:');
          console.log(stderr);
        }
        
        resolve();
      });
      
      // Afficher la progression
      child.stdout?.on('data', (data) => {
        process.stdout.write(data);
      });
      
      child.stderr?.on('data', (data) => {
        process.stdout.write(data);
      });
    });
    
    // Vérifier que le fichier a été créé
    if (fs.existsSync(dumpFilePath)) {
      const stats = fs.statSync(dumpFilePath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      console.log('\n✅ Dump créé avec succès !');
      console.log(`📁 Fichier: ${dumpFileName}`);
      console.log(`📏 Taille: ${fileSizeMB} MB`);
      console.log(`📅 Créé le: ${stats.birthtime.toLocaleString()}\n`);
      
      // Post-traitement du fichier pour le rendre compatible avec la production
      console.log('🔧 Post-traitement pour la compatibilité production...');
      
      let fileContent = fs.readFileSync(dumpFilePath, 'utf8');
      
      // Supprimer les références à la locale Windows
      fileContent = fileContent.replace(/LC_COLLATE = 'French_France\.1252'/g, '');
      fileContent = fileContent.replace(/LC_CTYPE = 'French_France\.1252'/g, '');
      
      // Supprimer les paramètres PostgreSQL non supportés
      fileContent = fileContent.replace(/SET transaction_timeout = 0;/g, '');
      fileContent = fileContent.replace(/SET statement_timeout = 0;/g, '');
      
      // Supprimer les commandes CREATE DATABASE et \connect
      fileContent = fileContent.replace(/CREATE DATABASE .*;/g, '');
      fileContent = fileContent.replace(/\\connect .*/g, '');
      
      // Nettoyer les lignes vides multiples
      fileContent = fileContent.replace(/\n\s*\n\s*\n/g, '\n\n');
      
      // Réécrire le fichier
      fs.writeFileSync(dumpFilePath, fileContent, 'utf8');
      
      console.log('✅ Post-traitement terminé !');
      
      // Vérifier l'encodage du fichier
      console.log('\n🔍 Vérification de l\'encodage...');
      const hasUtf8Content = /[^\x00-\x7F]/.test(fileContent);
      
      if (hasUtf8Content) {
        console.log('✅ Le fichier contient des caractères UTF-8');
      } else {
        console.log('ℹ️  Le fichier ne contient que des caractères ASCII');
      }
      
      // Afficher les premières lignes du dump
      console.log('\n📄 Aperçu du dump (premières 10 lignes):');
      console.log('==========================================');
      const lines = fileContent.split('\n').slice(0, 10);
      lines.forEach((line, index) => {
        console.log(`${(index + 1).toString().padStart(2, ' ')}: ${line}`);
      });
      
      if (fileContent.split('\n').length > 10) {
        console.log('   ...');
      }
      
      // Instructions pour l'import en production
      console.log('\n📋 INSTRUCTIONS POUR L\'IMPORT EN PRODUCTION:');
      console.log('=============================================');
      console.log('1. Copiez le fichier sur le serveur de production:');
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
      
    } else {
      throw new Error('Le fichier de dump n\'a pas été créé');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la création du dump:', error.message);
    
    // Suggestions de dépannage
    console.log('\n🔧 DÉPANNAGE:');
    console.log('==============');
    console.log('1. Vérifiez que PostgreSQL est installé et accessible');
    console.log('2. Vérifiez que le fichier .env existe avec les bonnes valeurs');
    console.log('3. Vérifiez que l\'utilisateur a les permissions nécessaires');
    console.log('4. Vérifiez que la base de données existe et est accessible');
    
    throw error;
  }
}

// Exécuter le script
if (require.main === module) {
  createProductionDump()
    .then(() => {
      console.log('\n🎉 Dump compatible production créé avec succès !');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Erreur:', error.message);
      process.exit(1);
    });
}

module.exports = { createProductionDump };
