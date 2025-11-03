// Script pour vérifier les données locales et les recréer sur la production
require('dotenv').config();
const { Pool } = require('pg');

async function checkLocalData() {
    console.log('🔍 Vérification des données locales...\n');
    
    try {
        // Configuration pour la base locale - essayer différentes configurations
        const configs = [
            {
                host: 'localhost',
                port: 5432,
                database: 'eb_vision_2_0',
                user: 'postgres',
                password: 'postgres'
            },
            {
                host: 'localhost',
                port: 5432,
                database: 'eb_vision_2_0',
                user: 'postgres',
                password: 'password'
            },
            {
                host: 'localhost',
                port: 5432,
                database: 'eb_vision_2_0',
                user: 'postgres',
                password: ''
            }
        ];

        let localPool = null;
        let connected = false;

        for (let i = 0; i < configs.length; i++) {
            const config = configs[i];
            console.log(`🔌 Tentative de connexion ${i + 1}/${configs.length}...`);
            console.log(`   Host: ${config.host}, User: ${config.user}, DB: ${config.database}`);
            
            try {
                localPool = new Pool({
                    ...config,
                    max: 20,
                    idleTimeoutMillis: 30000,
                    connectionTimeoutMillis: 5000
                });

                const testResult = await localPool.query('SELECT NOW() as current_time');
                console.log(`✅ Connexion locale réussie - Heure: ${testResult.rows[0].current_time}`);
                connected = true;
                break;
            } catch (error) {
                console.log(`❌ Échec de la connexion: ${error.message}`);
                if (localPool) {
                    await localPool.end();
                }
            }
        }

        if (!connected) {
            console.error('❌ Impossible de se connecter à la base de données locale');
            console.log('💡 Vérifiez que PostgreSQL est démarré et que les informations de connexion sont correctes');
            return;
        }

        console.log('\n2️⃣ Vérification des tables d\'authentification...');
        
        // Vérifier users
        try {
            const usersResult = await localPool.query('SELECT COUNT(*) as count FROM users');
            console.log(`📊 Users: ${usersResult.rows[0].count} enregistrements`);
            
            if (usersResult.rows[0].count > 0) {
                const sampleUsers = await localPool.query(`
                    SELECT nom, prenom, email, login, role, statut 
                    FROM users 
                    LIMIT 5
                `);
                console.log('👥 Utilisateurs:');
                sampleUsers.rows.forEach(user => {
                    console.log(`   - ${user.nom} ${user.prenom} (${user.email}) - ${user.role} - ${user.statut}`);
                });
            }
        } catch (error) {
            console.log(`❌ Erreur avec users: ${error.message}`);
        }

        // Vérifier business_units
        try {
            const buResult = await localPool.query('SELECT COUNT(*) as count FROM business_units');
            console.log(`📊 Business Units: ${buResult.rows[0].count} enregistrements`);
            
            if (buResult.rows[0].count > 0) {
                const sampleBU = await localPool.query(`
                    SELECT name, description 
                    FROM business_units 
                    LIMIT 5
                `);
                console.log('🏢 Business Units:');
                sampleBU.rows.forEach(bu => {
                    console.log(`   - ${bu.name}: ${bu.description || 'Aucune description'}`);
                });
            }
        } catch (error) {
            console.log(`❌ Erreur avec business_units: ${error.message}`);
        }

        // Vérifier roles
        try {
            const rolesResult = await localPool.query('SELECT COUNT(*) as count FROM roles');
            console.log(`📊 Roles: ${rolesResult.rows[0].count} enregistrements`);
            
            if (rolesResult.rows[0].count > 0) {
                const sampleRoles = await localPool.query(`
                    SELECT name, description 
                    FROM roles 
                    LIMIT 5
                `);
                console.log('🎭 Rôles:');
                sampleRoles.rows.forEach(role => {
                    console.log(`   - ${role.name}: ${role.description || 'Aucune description'}`);
                });
            }
        } catch (error) {
            console.log(`❌ Erreur avec roles: ${error.message}`);
        }

        // Vérifier permissions
        try {
            const permissionsResult = await localPool.query('SELECT COUNT(*) as count FROM permissions');
            console.log(`📊 Permissions: ${permissionsResult.rows[0].count} enregistrements`);
        } catch (error) {
            console.log(`❌ Erreur avec permissions: ${error.message}`);
        }

        // Vérifier role_permissions
        try {
            const rolePermsResult = await localPool.query('SELECT COUNT(*) as count FROM role_permissions');
            console.log(`📊 Role Permissions: ${rolePermsResult.rows[0].count} enregistrements`);
        } catch (error) {
            console.log(`❌ Erreur avec role_permissions: ${error.message}`);
        }

        // Vérifier user_permissions
        try {
            const userPermsResult = await localPool.query('SELECT COUNT(*) as count FROM user_permissions');
            console.log(`📊 User Permissions: ${userPermsResult.rows[0].count} enregistrements`);
        } catch (error) {
            console.log(`❌ Erreur avec user_permissions: ${error.message}`);
        }

        // Vérifier user_business_unit_access
        try {
            const userBUResult = await localPool.query('SELECT COUNT(*) as count FROM user_business_unit_access');
            console.log(`📊 User Business Unit Access: ${userBUResult.rows[0].count} enregistrements`);
        } catch (error) {
            console.log(`❌ Erreur avec user_business_unit_access: ${error.message}`);
        }

        console.log('\n3️⃣ Vérification des autres tables importantes...');
        
        const importantTables = ['utilisateurs', 'collaborateurs', 'missions', 'opportunities', 'companies'];
        
        for (const table of importantTables) {
            try {
                const countResult = await localPool.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`📊 ${table}: ${countResult.rows[0].count} enregistrements`);
            } catch (error) {
                console.log(`❌ Table ${table} non trouvée ou erreur: ${error.message}`);
            }
        }

        await localPool.end();
        
        console.log('\n🎯 Vérification locale terminée !');
        console.log('\n💡 Prochaines étapes:');
        console.log('1. Transférez ce script sur le serveur de production');
        console.log('2. Exécutez: node scripts/recreate-local-data.js');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

checkLocalData().catch(console.error);
