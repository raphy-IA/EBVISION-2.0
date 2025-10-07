// Script pour diagnostiquer et corriger les permissions sur la production
require('dotenv').config();
const { Pool } = require('pg');

async function fixPermissionsProduction() {
    console.log('🔧 Diagnostic et correction des permissions sur la production...\n');
    
    try {
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

        console.log('1️⃣ Test de connexion...');
        const testResult = await productionPool.query('SELECT NOW() as current_time');
        console.log(`✅ Connexion réussie - Heure: ${testResult.rows[0].current_time}`);

        console.log('\n2️⃣ Diagnostic des tables d\'authentification...');
        
        // Vérifier les utilisateurs
        const usersResult = await productionPool.query('SELECT COUNT(*) as count FROM users');
        console.log(`📊 users: ${usersResult.rows[0].count} enregistrements`);
        
        if (usersResult.rows[0].count > 0) {
            const sampleUsers = await productionPool.query('SELECT id, nom, prenom, email, role, statut FROM users LIMIT 3');
            console.log('👥 Exemples d\'utilisateurs:');
            sampleUsers.rows.forEach(user => {
                console.log(`   - ${user.nom} ${user.prenom} (${user.email}) - ${user.role} - ${user.statut}`);
            });
        }

        // Vérifier les rôles
        const rolesResult = await productionPool.query('SELECT COUNT(*) as count FROM roles');
        console.log(`📊 roles: ${rolesResult.rows[0].count} enregistrements`);
        
        if (rolesResult.rows[0].count > 0) {
            const sampleRoles = await productionPool.query('SELECT id, name, description FROM roles LIMIT 5');
            console.log('🎭 Exemples de rôles:');
            sampleRoles.rows.forEach(role => {
                console.log(`   - ${role.name}: ${role.description}`);
            });
        }

        // Vérifier les permissions
        const permissionsResult = await productionPool.query('SELECT COUNT(*) as count FROM permissions');
        console.log(`📊 permissions: ${permissionsResult.rows[0].count} enregistrements`);
        
        if (permissionsResult.rows[0].count > 0) {
            const samplePermissions = await productionPool.query('SELECT id, name, description FROM permissions LIMIT 5');
            console.log('🔐 Exemples de permissions:');
            samplePermissions.rows.forEach(perm => {
                console.log(`   - ${perm.name}: ${perm.description}`);
            });
        }

        // Vérifier les associations rôle-permission
        const rolePermissionsResult = await productionPool.query('SELECT COUNT(*) as count FROM role_permissions');
        console.log(`📊 role_permissions: ${rolePermissionsResult.rows[0].count} enregistrements`);

        // Vérifier les associations utilisateur-business_unit
        const userBuResult = await productionPool.query('SELECT COUNT(*) as count FROM user_business_unit_access');
        console.log(`📊 user_business_unit_access: ${userBuResult.rows[0].count} enregistrements`);

        console.log('\n3️⃣ Vérification des permissions utilisateur...');
        
        // Trouver un utilisateur SUPER_ADMIN
        const adminUser = await productionPool.query(`
            SELECT id, nom, prenom, email, role 
            FROM users 
            WHERE role = 'SUPER_ADMIN' 
            LIMIT 1
        `);

        if (adminUser.rows.length > 0) {
            const admin = adminUser.rows[0];
            console.log(`👑 Utilisateur admin trouvé: ${admin.nom} ${admin.prenom} (${admin.email})`);
            
            // Vérifier ses permissions
            const userPermissions = await productionPool.query(`
                SELECT p.name, p.description
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                JOIN roles r ON rp.role_id = r.id
                WHERE r.name = $1
                LIMIT 10
            `, [admin.role]);
            
            console.log(`🔑 Permissions de ${admin.role}:`);
            userPermissions.rows.forEach(perm => {
                console.log(`   - ${perm.name}: ${perm.description}`);
            });
        } else {
            console.log('❌ Aucun utilisateur SUPER_ADMIN trouvé !');
        }

        console.log('\n4️⃣ Correction des permissions manquantes...');
        
        // Vérifier si les permissions de menu existent
        const menuPermissions = await productionPool.query(`
            SELECT COUNT(*) as count 
            FROM permissions 
            WHERE name LIKE 'menu.%'
        `);
        
        console.log(`📋 Permissions de menu trouvées: ${menuPermissions.rows[0].count}`);
        
        if (menuPermissions.rows[0].count === 0) {
            console.log('⚠️ Aucune permission de menu trouvée - création des permissions de base...');
            
            // Créer les permissions de menu de base
            const basicMenuPermissions = [
                'menu.dashboard.main',
                'menu.reports.general',
                'menu.time_entries.input',
                'menu.missions.list',
                'menu.opportunities.list',
                'menu.collaborateurs.list',
                'menu.settings.general',
                'menu.business_units.list',
                'menu.users.list'
            ];
            
            for (const permName of basicMenuPermissions) {
                try {
                    await productionPool.query(`
                        INSERT INTO permissions (id, name, description, category) 
                        VALUES (gen_random_uuid(), $1, $2, 'menu')
                        ON CONFLICT (name) DO NOTHING
                    `, [permName, `Accès au menu ${permName}`]);
                    console.log(`   ✅ Permission créée: ${permName}`);
                } catch (error) {
                    console.log(`   ❌ Erreur avec ${permName}: ${error.message}`);
                }
            }
        }

        await productionPool.end();
        
        console.log('\n🎉 Diagnostic terminé !');
        console.log('\n💡 Prochaines étapes:');
        console.log('1. Redémarrez l\'application: pm2 restart eb-vision-2-0');
        console.log('2. Vérifiez que les menus s\'affichent correctement');
        console.log('3. Si problème persiste, vérifiez les logs de l\'application');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

fixPermissionsProduction().catch(console.error);











