// Script simple pour créer les permissions de menu
require('dotenv').config();
const { Pool } = require('pg');

async function fixPermissionsSimple() {
    console.log('🔧 Création simple des permissions de menu...\n');
    
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

        console.log('\n2️⃣ Vérification des permissions existantes...');
        
        // Vérifier si les permissions de menu existent déjà
        const existingMenuPerms = await productionPool.query(`
            SELECT COUNT(*) as count 
            FROM permissions 
            WHERE name LIKE 'menu.%'
        `);
        
        console.log(`📋 Permissions de menu existantes: ${existingMenuPerms.rows[0].count}`);
        
        if (existingMenuPerms.rows[0].count > 0) {
            console.log('✅ Les permissions de menu existent déjà !');
            
            // Lister les permissions existantes
            const menuPerms = await productionPool.query(`
                SELECT name, description 
                FROM permissions 
                WHERE name LIKE 'menu.%'
                LIMIT 10
            `);
            
            console.log('📋 Permissions trouvées:');
            menuPerms.rows.forEach(perm => {
                console.log(`   - ${perm.name}: ${perm.description}`);
            });
        } else {
            console.log('⚠️ Aucune permission de menu trouvée - création...');
            
            // Créer les permissions de base
            const basicPermissions = [
                'menu.dashboard.main',
                'menu.users.list',
                'menu.business_units.list'
            ];
            
            for (const permName of basicPermissions) {
                try {
                    await productionPool.query(`
                        INSERT INTO permissions (id, name, description, category) 
                        VALUES (gen_random_uuid(), $1, $2, 'menu')
                    `, [permName, `Accès au menu ${permName}`]);
                    console.log(`   ✅ ${permName} créée`);
                } catch (error) {
                    console.log(`   ❌ ${permName} - ${error.message}`);
                }
            }
        }

        console.log('\n3️⃣ Vérification des associations rôle-permission...');
        
        // Vérifier si le rôle SUPER_ADMIN a des permissions de menu
        const superAdminPerms = await productionPool.query(`
            SELECT COUNT(*) as count
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            JOIN roles r ON rp.role_id = r.id
            WHERE r.name = 'SUPER_ADMIN' AND p.name LIKE 'menu.%'
        `);
        
        console.log(`🔑 Permissions de menu du SUPER_ADMIN: ${superAdminPerms.rows[0].count}`);
        
        if (superAdminPerms.rows[0].count === 0) {
            console.log('⚠️ Aucune permission de menu associée au SUPER_ADMIN - association...');
            
            // Récupérer le rôle SUPER_ADMIN
            const superAdminRole = await productionPool.query(
                'SELECT id FROM roles WHERE name = $1', 
                ['SUPER_ADMIN']
            );
            
            if (superAdminRole.rows.length > 0) {
                const roleId = superAdminRole.rows[0].id;
                
                // Récupérer les permissions de menu
                const menuPermissions = await productionPool.query(`
                    SELECT id FROM permissions WHERE name LIKE 'menu.%'
                `);
                
                let associatedCount = 0;
                
                for (const perm of menuPermissions.rows) {
                    try {
                        await productionPool.query(`
                            INSERT INTO role_permissions (id, role_id, permission_id) 
                            VALUES (gen_random_uuid(), $1, $2)
                        `, [roleId, perm.id]);
                        associatedCount++;
                    } catch (error) {
                        // Ignorer les erreurs de doublon
                    }
                }
                
                console.log(`   ✅ ${associatedCount} permissions associées au SUPER_ADMIN`);
            }
        }

        await productionPool.end();
        
        console.log('\n🎉 Vérification terminée !');
        console.log('\n💡 Prochaines étapes:');
        console.log('1. Redémarrez l\'application: pm2 restart eb-vision-2-0');
        console.log('2. Testez la page des utilisateurs');
        console.log('3. Les menus devraient rester visibles !');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

fixPermissionsSimple().catch(console.error);



















