const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Charger la configuration de l'application
require('dotenv').config();

// Script pour créer un dump UTF-8 en utilisant la configuration de l'application
async function createUtf8DumpWithAppConfig() {
  console.log('🗄️  Création du dump UTF-8 avec la configuration de l\'application...\n');
  
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
    const dumpFileName = `backup_utf8_${timestamp}.sql`;
    const dumpFilePath = path.join(__dirname, '..', dumpFileName);
    
    console.log(`📁 Fichier de dump: ${dumpFileName}`);
    console.log(`📁 Chemin complet: ${dumpFilePath}\n`);
    
    // Commande pg_dump avec options UTF-8
    const pgDumpCommand = [
      'pg_dump',
      `--host=${dbConfig.host}`,
      `--port=${dbConfig.port}`,
      `--username=${dbConfig.user}`,
      `--dbname=${dbConfig.database}`,
      '--verbose',
      '--clean',
      '--create',
      '--if-exists',
      '--no-owner',
      '--no-privileges',
      '--encoding=UTF8',
      '--format=plain',
      `--file="${dumpFilePath}"`
    ].join(' ');
    
    console.log('🔧 Commande pg_dump:');
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
      
      // Vérifier l'encodage du fichier
      console.log('🔍 Vérification de l\'encodage...');
      const fileContent = fs.readFileSync(dumpFilePath, 'utf8');
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
      
      // Instructions pour l'import
      console.log('\n📋 INSTRUCTIONS POUR L\'IMPORT EN PRODUCTION:');
      console.log('=============================================');
      console.log('1. Copiez le fichier sur le serveur de production:');
      console.log(`   scp ${dumpFileName} user@production-server:/path/to/backup/`);
      console.log('');
      console.log('2. Sur le serveur de production, importez le dump:');
      console.log(`   psql -h localhost -U postgres -d ebvision_production < ${dumpFileName}`);
      console.log('');
      console.log('3. Ou utilisez la commande complète:');
      console.log(`   PGPASSWORD=your_password psql -h localhost -U postgres -d ebvision_production -f ${dumpFileName}`);
      console.log('');
      console.log('4. Vérifiez l\'import:');
      console.log('   psql -h localhost -U postgres -d ebvision_production -c "\\dt"');
      
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
    console.log('');
    console.log('Variables d\'environnement utilisées:');
    console.log(`   DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   DB_PORT: ${process.env.DB_PORT || 5432}`);
    console.log(`   DB_NAME: ${process.env.DB_NAME || 'eb_vision_2_0'}`);
    console.log(`   DB_USER: ${process.env.DB_USER || 'postgres'}`);
    console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '***' : 'Non défini'}`);
    
    throw error;
  }
}

// Exécuter le script
if (require.main === module) {
  createUtf8DumpWithAppConfig()
    .then(() => {
      console.log('\n🎉 Dump UTF-8 créé avec succès !');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Erreur:', error.message);
      process.exit(1);
    });
}

module.exports = { createUtf8DumpWithAppConfig };
