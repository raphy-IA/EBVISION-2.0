// Script d'import de la base de données locale vers la production
require('dotenv').config();

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration de la base de données de production
const productionPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'ebpadfbq_eb_vision_2_0',
    user: process.env.DB_USER || 'ebpadfbq_eb_admin20',
    password: process.env.DB_PASSWORD || '87ifet-Z)&',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: false,
    family: 4
});

async function importToProduction() {
    console.log('🚀 Import de la base de données locale vers la production...\n');
    
    try {
        // 1. Vérifier la connexion à la production
        console.log('1️⃣ Test de connexion à la base de production...');
        const testResult = await productionPool.query('SELECT NOW() as current_time');
        console.log(`✅ Connexion réussie - Heure serveur: ${testResult.rows[0].current_time}`);
        
        // 2. Trouver le fichier de sauvegarde le plus récent
        console.log('\n2️⃣ Recherche du fichier de sauvegarde...');
        const backupFiles = fs.readdirSync('.').filter(file => file.startsWith('backup_local_') && file.endsWith('.sql'));
        
        if (backupFiles.length === 0) {
            console.log('❌ Aucun fichier de sauvegarde trouvé');
            console.log('💡 Exécutez d\'abord: pg_dump -h localhost -U postgres -d eb_vision_2_0 --clean --if-exists --no-owner --no-privileges > backup_local.sql');
            return;
        }
        
        // Prendre le fichier le plus récent
        const latestBackup = backupFiles.sort().pop();
        console.log(`✅ Fichier de sauvegarde trouvé: ${latestBackup}`);
        
        // 3. Lire le contenu du fichier de sauvegarde
        console.log('\n3️⃣ Lecture du fichier de sauvegarde...');
        const backupContent = fs.readFileSync(latestBackup, 'utf8');
        console.log(`✅ Fichier lu (${backupContent.length} caractères)`);
        
        // 4. Préparer le contenu pour la production
        console.log('\n4️⃣ Préparation du contenu pour la production...');
        
        // Remplacer les références à la base locale par la base de production
        let productionContent = backupContent
            .replace(/eb_vision_2_0/g, process.env.DB_NAME || 'ebpadfbq_eb_vision_2_0')
            .replace(/postgres/g, process.env.DB_USER || 'ebpadfbq_eb_admin20');
        
        // Supprimer les lignes qui pourraient causer des problèmes
        productionContent = productionContent
            .split('\n')
            .filter(line => {
                // Supprimer les lignes de création d'extensions si elles existent déjà
                if (line.includes('CREATE EXTENSION') && line.includes('uuid-ossp')) {
                    return false;
                }
                // Supprimer les lignes de propriétaire
                if (line.includes('OWNER TO')) {
                    return false;
                }
                return true;
            })
            .join('\n');
        
        console.log('✅ Contenu préparé pour la production');
        
        // 5. Créer un fichier temporaire pour la production
        const productionBackupFile = `backup_production_${Date.now()}.sql`;
        fs.writeFileSync(productionBackupFile, productionContent);
        console.log(`✅ Fichier de production créé: ${productionBackupFile}`);
        
        // 6. Exécuter l'import
        console.log('\n5️⃣ Import vers la production...');
        console.log('⚠️  ATTENTION: Cette opération va écraser la base de production !');
        console.log('📋 Voulez-vous continuer ? (Ctrl+C pour annuler)');
        
        // Attendre 5 secondes pour permettre l'annulation
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Exécuter le script SQL
        const importCommand = `psql -h ${process.env.DB_HOST || 'localhost'} -p ${process.env.DB_PORT || 5432} -U ${process.env.DB_USER || 'ebpadfbq_eb_admin20'} -d ${process.env.DB_NAME || 'ebpadfbq_eb_vision_2_0'} -f ${productionBackupFile}`;
        
        console.log(`🔄 Exécution de: ${importCommand}`);
        
        exec(importCommand, { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || '87ifet-Z)&' } }, async (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Erreur lors de l\'import:', error.message);
                return;
            }
            
            if (stderr) {
                console.log('⚠️  Avertissements:', stderr);
            }
            
            console.log('✅ Import terminé avec succès !');
            console.log('📊 Sortie:', stdout);
            
            // 7. Nettoyer le fichier temporaire
            fs.unlinkSync(productionBackupFile);
            console.log(`🗑️  Fichier temporaire supprimé: ${productionBackupFile}`);
            
            // 8. Vérification finale
            console.log('\n6️⃣ Vérification de l\'import...');
            const verificationResult = await productionPool.query('SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = \'public\'');
            console.log(`✅ Nombre de tables dans la base de production: ${verificationResult.rows[0].total_tables}`);
            
            console.log('\n🎉 Import terminé avec succès !');
            console.log('🔄 Redémarrez l\'application de production si nécessaire.');
            
            await productionPool.end();
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'import:', error.message);
        await productionPool.end();
    }
}

importToProduction().catch(console.error);
