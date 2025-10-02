// Script pour importer le dump propre sur le serveur de production
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

async function importCleanDump() {
    console.log('🚀 Import du dump propre vers la production...\n');
    
    try {
        // 1. Configuration de la base de données
        const pool = new Pool({
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

        // 2. Test de connexion
        console.log('1️⃣ Test de connexion à la base de production...');
        const testResult = await pool.query('SELECT NOW() as current_time');
        console.log(`✅ Connexion réussie - Heure serveur: ${testResult.rows[0].current_time}`);
        await pool.end();

        // 3. Recherche du fichier de dump
        console.log('\n2️⃣ Recherche du fichier de dump...');
        const files = fs.readdirSync(__dirname + '/..');
        const dumpFiles = files.filter(file => 
            file.startsWith('backup_local_clean_') && file.endsWith('.sql')
        ).sort().reverse(); // Prendre le plus récent
        
        if (dumpFiles.length === 0) {
            console.error('❌ Aucun fichier de dump trouvé !');
            console.log('💡 Assurez-vous d\'avoir transféré le fichier de dump depuis votre machine locale');
            return;
        }
        
        const dumpFile = dumpFiles[0];
        const dumpPath = path.join(__dirname, '..', dumpFile);
        const stats = fs.statSync(dumpPath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        console.log(`✅ Fichier trouvé: ${dumpFile}`);
        console.log(`📊 Taille: ${fileSizeMB} MB`);

        // 4. Vérification du contenu du fichier
        console.log('\n3️⃣ Vérification du contenu du dump...');
        const content = fs.readFileSync(dumpPath, 'utf8');
        
        // Vérifier l'encodage
        const hasBOM = content.charCodeAt(0) === 0xFEFF;
        if (hasBOM) {
            console.log('⚠️  BOM détecté, nettoyage en cours...');
            const cleanContent = content.slice(1);
            fs.writeFileSync(dumpPath, cleanContent, 'utf8');
            console.log('✅ BOM supprimé');
        }
        
        // Vérifier les tables importantes
        const hasUsers = content.includes('CREATE TABLE users') || content.includes('INSERT INTO users');
        const hasBusinessUnits = content.includes('CREATE TABLE business_units') || content.includes('INSERT INTO business_units');
        const hasRoles = content.includes('CREATE TABLE roles') || content.includes('INSERT INTO roles');
        
        console.log('🔍 Vérification des tables importantes:');
        console.log(`   ${hasUsers ? '✅' : '❌'} Table users`);
        console.log(`   ${hasBusinessUnits ? '✅' : '❌'} Table business_units`);
        console.log(`   ${hasRoles ? '✅' : '❌'} Table roles`);

        // 5. Confirmation avant import
        console.log('\n⚠️  ATTENTION: Cette opération va écraser la base de production !');
        console.log('📋 Voulez-vous continuer ? (Ctrl+C pour annuler)');
        console.log('⏳ Attente de 10 secondes...');
        
        await new Promise(resolve => setTimeout(resolve, 10000));

        // 6. Import vers la production
        console.log('\n4️⃣ Import vers la production...');
        const importCommand = `psql -h localhost -p 5432 -U ebpadfbq_eb_admin20 -d ebpadfbq_eb_vision_2_0 -f "${dumpPath}"`;
        
        console.log(`🔧 Exécution de: ${importCommand}`);
        
        exec(importCommand, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Erreur lors de l\'import:', error.message);
                return;
            }
            
            if (stderr) {
                console.log('⚠️  Avertissements de l\'import:');
                console.log(stderr);
            }
            
            if (stdout) {
                console.log('📋 Sortie de l\'import:');
                console.log(stdout);
            }
            
            console.log('\n✅ Import terminé !');
            
            // 7. Vérification post-import
            console.log('\n5️⃣ Vérification post-import...');
            verifyImport();
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

async function verifyImport() {
    try {
        const pool = new Pool({
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

        // Vérifier les tables d'authentification
        const authTables = ['users', 'business_units', 'roles', 'permissions'];
        
        for (const table of authTables) {
            try {
                const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`📊 ${table}: ${countResult.rows[0].count} enregistrements`);
                
                if (table === 'users' && countResult.rows[0].count > 0) {
                    const usersResult = await pool.query(`
                        SELECT nom, prenom, email, role, statut 
                        FROM users 
                        LIMIT 3
                    `);
                    console.log('👥 Utilisateurs:');
                    usersResult.rows.forEach(user => {
                        console.log(`   - ${user.nom} ${user.prenom} (${user.email}) - ${user.role}`);
                    });
                }
            } catch (error) {
                console.log(`❌ Erreur avec ${table}: ${error.message}`);
            }
        }

        await pool.end();
        
        console.log('\n🎉 Vérification terminée !');
        console.log('\n💡 Prochaines étapes:');
        console.log('1. Redémarrez l\'application: pm2 restart eb-vision-2-0');
        console.log('2. Testez la connexion avec vos identifiants');
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error.message);
    }
}

importCleanDump().catch(console.error);







