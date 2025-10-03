// Script pour vérifier l'état de la base de données et de l'application
require('dotenv').config();
const { Pool } = require('pg');

async function checkDatabaseStatus() {
    console.log('🔍 Vérification de l\'état de la base de données...\n');
    
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
        console.log('1️⃣ Test de connexion à la base de données...');
        const testResult = await pool.query('SELECT NOW() as current_time, version() as pg_version');
        console.log(`✅ Connexion réussie - Heure serveur: ${testResult.rows[0].current_time}`);
        console.log(`📊 Version PostgreSQL: ${testResult.rows[0].pg_version.split(' ')[1]}`);

        // 3. Vérifier les tables
        console.log('\n2️⃣ Vérification des tables...');
        const tablesResult = await pool.query(`
            SELECT table_name, table_type 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log(`📋 Nombre de tables: ${tablesResult.rows.length}`);
        tablesResult.rows.forEach(table => {
            console.log(`   - ${table.table_name} (${table.table_type})`);
        });

        // 4. Vérifier les utilisateurs
        console.log('\n3️⃣ Vérification des utilisateurs...');
        try {
            const usersResult = await pool.query('SELECT COUNT(*) as user_count FROM users');
            console.log(`👥 Nombre d'utilisateurs: ${usersResult.rows[0].user_count}`);
            
            if (usersResult.rows[0].user_count > 0) {
                const adminUsers = await pool.query(`
                    SELECT id, nom, prenom, email, role, statut 
                    FROM users 
                    WHERE role = 'SUPER_ADMIN' 
                    LIMIT 5
                `);
                console.log('👑 Utilisateurs SUPER_ADMIN:');
                adminUsers.rows.forEach(user => {
                    console.log(`   - ${user.nom} ${user.prenom} (${user.email}) - ${user.statut}`);
                });
            }
        } catch (error) {
            console.log(`⚠️  Erreur lors de la vérification des utilisateurs: ${error.message}`);
        }

        // 5. Vérifier les business units
        console.log('\n4️⃣ Vérification des business units...');
        try {
            const buResult = await pool.query('SELECT COUNT(*) as bu_count FROM business_units');
            console.log(`🏢 Nombre de business units: ${buResult.rows[0].bu_count}`);
        } catch (error) {
            console.log(`⚠️  Erreur lors de la vérification des business units: ${error.message}`);
        }

        // 6. Vérifier les rôles et permissions
        console.log('\n5️⃣ Vérification des rôles et permissions...');
        try {
            const rolesResult = await pool.query('SELECT COUNT(*) as role_count FROM roles');
            const permissionsResult = await pool.query('SELECT COUNT(*) as perm_count FROM permissions');
            console.log(`🎭 Nombre de rôles: ${rolesResult.rows[0].role_count}`);
            console.log(`🔐 Nombre de permissions: ${permissionsResult.rows[0].perm_count}`);
        } catch (error) {
            console.log(`⚠️  Erreur lors de la vérification des rôles: ${error.message}`);
        }

        // 7. Vérifier l'état de PM2
        console.log('\n6️⃣ Vérification de l\'état de l\'application...');
        const { exec } = require('child_process');
        
        exec('pm2 status', (error, stdout, stderr) => {
            if (error) {
                console.log(`❌ Erreur PM2: ${error.message}`);
                return;
            }
            console.log('📊 État PM2:');
            console.log(stdout);
        });

        await pool.end();
        
        console.log('\n🎉 Vérification terminée !');
        console.log('💡 Si vous ne pouvez pas vous connecter, essayez de redémarrer l\'application:');
        console.log('   pm2 restart eb-vision-2-0');
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error.message);
        console.log('\n🔧 Solutions possibles:');
        console.log('1. Redémarrer l\'application: pm2 restart eb-vision-2-0');
        console.log('2. Vérifier les logs: pm2 logs eb-vision-2-0');
        console.log('3. Recréer l\'utilisateur admin si nécessaire');
    }
}

checkDatabaseStatus().catch(console.error);









