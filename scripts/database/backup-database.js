const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Charger la configuration de l'application
require('dotenv').config();

/**
 * Script de sauvegarde de la base de données
 * Crée un dump complet de la base de données avant la génération de données de démo
 */
async function backupDatabase() {
  console.log('\n🗄️  SAUVEGARDE DE LA BASE DE DONNÉES\n');
  console.log('='.repeat(50));
  
  try {
    // Configuration depuis .env
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'eb_vision_2_0',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    };
    
    console.log('\n📋 Configuration de la base de données:');
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   Port: ${dbConfig.port}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   User: ${dbConfig.user}`);
    console.log(`   Password: ${dbConfig.password ? '***' : 'Non défini'}\n`);
    
    // Créer le dossier backups s'il n'existe pas
    const backupsDir = path.join(__dirname, '..', '..', 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
      console.log('📁 Dossier backups créé\n');
    }
    
    // Nom du fichier avec timestamp
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .split('.')[0];
    const dumpFileName = `backup_${dbConfig.database}_${timestamp}.sql`;
    const dumpFilePath = path.join(backupsDir, dumpFileName);
    
    console.log(`📁 Fichier de sauvegarde: ${dumpFileName}`);
    console.log(`📁 Chemin complet: ${dumpFilePath}\n`);
    
    // Vérifier que pg_dump est disponible
    try {
      await execAsync('pg_dump --version');
    } catch (error) {
      throw new Error('pg_dump n\'est pas installé ou n\'est pas dans le PATH. Installez PostgreSQL client tools.');
    }
    
    // Commande pg_dump
    const pgDumpCommand = [
      'pg_dump',
      `--host=${dbConfig.host}`,
      `--port=${dbConfig.port}`,
      `--username=${dbConfig.user}`,
      `--dbname=${dbConfig.database}`,
      '--verbose',
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-privileges',
      '--encoding=UTF8',
      '--format=plain',
      `--file="${dumpFilePath}"`
    ].join(' ');
    
    // Variables d'environnement
    const env = {
      ...process.env,
      PGPASSWORD: dbConfig.password
    };
    
    console.log('⏳ Création de la sauvegarde en cours...\n');
    
    // Exécuter pg_dump
    try {
      const { stdout, stderr } = await execAsync(pgDumpCommand, { env });
      
      if (stderr && !stderr.includes('NOTICE')) {
        console.log('⚠️  Avertissements:', stderr);
      }
    } catch (error) {
      // pg_dump peut retourner un code de sortie même en cas de succès
      // Vérifier que le fichier a été créé
      if (!fs.existsSync(dumpFilePath)) {
        throw new Error(`Erreur lors de la création du dump: ${error.message}`);
      }
    }
    
    // Vérifier que le fichier a été créé
    if (!fs.existsSync(dumpFilePath)) {
      throw new Error('Le fichier de sauvegarde n\'a pas été créé');
    }
    
    const stats = fs.statSync(dumpFilePath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log('\n✅ Sauvegarde créée avec succès !');
    console.log(`📁 Fichier: ${dumpFileName}`);
    console.log(`📏 Taille: ${fileSizeMB} MB`);
    console.log(`📅 Créé le: ${stats.birthtime.toLocaleString('fr-FR')}`);
    console.log(`📂 Emplacement: ${backupsDir}\n`);
    
    // Afficher les instructions de restauration
    console.log('📋 INSTRUCTIONS DE RESTAURATION:');
    console.log('='.repeat(50));
    console.log('Pour restaurer cette sauvegarde, utilisez:');
    console.log(`   psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} < "${dumpFilePath}"`);
    console.log('\nOu avec mot de passe:');
    console.log(`   PGPASSWORD=${dbConfig.password ? '***' : 'votre_mot_de_passe'} psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} < "${dumpFilePath}"\n`);
    
    return dumpFilePath;
    
  } catch (error) {
    console.error('\n❌ Erreur lors de la sauvegarde:', error.message);
    console.log('\n🔧 DÉPANNAGE:');
    console.log('==============');
    console.log('1. Vérifiez que PostgreSQL est installé et accessible');
    console.log('2. Vérifiez que le fichier .env existe avec les bonnes valeurs');
    console.log('3. Vérifiez que l\'utilisateur a les permissions nécessaires');
    console.log('4. Vérifiez que la base de données existe et est accessible');
    console.log('5. Vérifiez que pg_dump est dans votre PATH\n');
    throw error;
  }
}

// Exécuter le script
if (require.main === module) {
  backupDatabase()
    .then((filePath) => {
      console.log('🎉 Sauvegarde terminée avec succès !');
      console.log(`📁 Fichier sauvegardé: ${filePath}\n`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Erreur:', error.message);
      process.exit(1);
    });
}

module.exports = { backupDatabase };

