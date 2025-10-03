// Script pour créer les permissions de menu avec la structure complète
require('dotenv').config();
const { Pool } = require('pg');

async function fixPermissionsComplete() {
    console.log('🔧 Création complète des permissions de menu...\n');
    
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

        console.log('\n2️⃣ Vérification de la structure de la table permissions...');
        
        // Vérifier la structure de la table permissions
        const tableStructure = await productionPool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'permissions' 
            ORDER BY ordinal_position
        `);
        
        console.log('📋 Structure de la table permissions:');
        tableStructure.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'})`);
        });

        console.log('\n3️⃣ Vérification des permissions existantes...');
        
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
                SELECT name, description, code 
                FROM permissions 
                WHERE name LIKE 'menu.%'
                LIMIT 5
            `);
            
            console.log('📋 Permissions trouvées:');
            menuPerms.rows.forEach(perm => {
                console.log(`   - ${perm.name} (${perm.code}): ${perm.description}`);
            });
        } else {
            console.log('⚠️ Aucune permission de menu trouvée - création...');
            
            // Créer les permissions de base avec tous les champs requis
            const basicPermissions = [
                { name: 'menu.dashboard.main', description: 'Accès au tableau de bord principal', code: 'DASHBOARD_MAIN' },
                { name: 'menu.users.list', description: 'Accès à la liste des utilisateurs', code: 'USERS_LIST' },
                { name: 'menu.business_units.list', description: 'Accès aux unités d\'affaires', code: 'BU_LIST' },
                { name: 'menu.reports.general', description: 'Accès aux rapports généraux', code: 'REPORTS_GENERAL' },
                { name: 'menu.missions.list', description: 'Accès à la liste des missions', code: 'MISSIONS_LIST' },
                { name: 'menu.opportunities.list', description: 'Accès à la liste des opportunités', code: 'OPPORTUNITIES_LIST' },
                { name: 'menu.collaborateurs.list', description: 'Accès à la liste des collaborateurs', code: 'COLLABORATEURS_LIST' },
                { name: 'menu.settings.general', description: 'Accès aux paramètres généraux', code: 'SETTINGS_GENERAL' }
            ];
            
            for (const permission of basicPermissions) {
                try {
                    await productionPool.query(`
                        INSERT INTO permissions (id, name, description, code, category, created_at, updated_at) 
                        VALUES (gen_random_uuid(), $1, $2, $3, 'menu', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    `, [permission.name, permission.description, permission.code]);
                    console.log(`   ✅ ${permission.name} (${permission.code}) créée`);
                } catch (error) {
                    console.log(`   ❌ ${permission.name} - ${error.message}`);
                }
            }
        }

        console.log('\n4️⃣ Vérification des associations rôle-permission...');
        
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
                            INSERT INTO role_permissions (id, role_id, permission_id, created_at, updated_at) 
                            VALUES (gen_random_uuid(), $1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
        
        console.log('\n🎉 Création des permissions terminée !');
        console.log('\n💡 Prochaines étapes:');
        console.log('1. Redémarrez l\'application: pm2 restart eb-vision-2-0');
        console.log('2. Testez la page des utilisateurs');
        console.log('3. Les menus devraient maintenant rester visibles !');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

fixPermissionsComplete().catch(console.error);










