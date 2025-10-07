// Script pour créer les permissions d'API manquantes
require('dotenv').config();
const { Pool } = require('pg');

async function createAPIPermissions() {
    console.log('🔌 Création des permissions d\'API manquantes...\n');
    
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

        console.log('\n2️⃣ Création des permissions d\'API...');
        
        // Permissions d'API pour la gestion des permissions
        const apiPermissions = [
            {
                name: 'permission.manage',
                code: 'PERMISSION_MANAGE',
                description: 'Gérer les permissions des rôles et utilisateurs',
                category: 'permissions'
            },
            {
                name: 'permission.assign',
                code: 'PERMISSION_ASSIGN',
                description: 'Assigner des permissions aux rôles',
                category: 'permissions'
            },
            {
                name: 'permission.revoke',
                code: 'PERMISSION_REVOKE',
                description: 'Révoquer des permissions des rôles',
                category: 'permissions'
            },
            {
                name: 'role.manage',
                code: 'ROLE_MANAGE',
                description: 'Gérer les rôles et leurs permissions',
                category: 'roles'
            },
            {
                name: 'api.permissions.read',
                code: 'API_PERMISSIONS_READ',
                description: 'Lire les permissions via l\'API',
                category: 'api'
            },
            {
                name: 'api.permissions.write',
                code: 'API_PERMISSIONS_WRITE',
                description: 'Modifier les permissions via l\'API',
                category: 'api'
            }
        ];

        let createdCount = 0;
        
        for (const perm of apiPermissions) {
            try {
                await productionPool.query(`
                    INSERT INTO permissions (id, name, code, description, category, created_at, updated_at)
                    VALUES (gen_random_uuid(), $1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                `, [perm.name, perm.code, perm.description, perm.category]);
                
                console.log(`   ✅ ${perm.name} (${perm.code}) créée`);
                createdCount++;
                
            } catch (error) {
                if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
                    console.log(`   ⚠️ ${perm.name} - déjà existante`);
                } else {
                    console.log(`   ❌ ${perm.name} - ${error.message}`);
                }
            }
        }
        
        console.log(`\n🎯 Résultat: ${createdCount} permissions d'API créées`);

        console.log('\n3️⃣ Association des permissions d\'API au rôle SUPER_ADMIN...');
        
        // Récupérer le rôle SUPER_ADMIN
        const superAdminRole = await productionPool.query(
            'SELECT id FROM roles WHERE name = $1', 
            ['SUPER_ADMIN']
        );
        
        if (superAdminRole.rows.length === 0) {
            console.log('❌ Rôle SUPER_ADMIN non trouvé !');
            return;
        }
        
        const roleId = superAdminRole.rows[0].id;
        console.log(`✅ Rôle SUPER_ADMIN trouvé: ${roleId}`);
        
        // Récupérer toutes les nouvelles permissions d'API
        const newAPIPermissions = await productionPool.query(`
            SELECT id, name, code FROM permissions 
            WHERE name IN ('permission.manage', 'permission.assign', 'permission.revoke', 'role.manage', 'api.permissions.read', 'api.permissions.write')
        `);
        
        console.log(`📋 ${newAPIPermissions.rows.length} permissions d'API à associer`);
        
        let associatedCount = 0;
        
        for (const perm of newAPIPermissions.rows) {
            try {
                await productionPool.query(`
                    INSERT INTO role_permissions (id, role_id, permission_id, created_at) 
                    VALUES (gen_random_uuid(), $1, $2, CURRENT_TIMESTAMP)
                `, [roleId, perm.id]);
                
                console.log(`   ✅ ${perm.name} (${perm.code}) associée`);
                associatedCount++;
                
            } catch (error) {
                if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
                    console.log(`   ⚠️ ${perm.name} - déjà associée`);
                } else {
                    console.log(`   ❌ ${perm.name} - ${error.message}`);
                }
            }
        }
        
        console.log(`\n🎯 Résultat: ${associatedCount} permissions d'API associées au SUPER_ADMIN`);

        // Vérification finale
        const finalCheck = await productionPool.query(`
            SELECT COUNT(*) as count
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            JOIN roles r ON rp.role_id = r.id
            WHERE r.name = 'SUPER_ADMIN' AND (p.name LIKE 'permission.%' OR p.name LIKE 'api.%')
        `);
        
        console.log(`🔑 Permissions d'API du SUPER_ADMIN après association: ${finalCheck.rows[0].count}`);

        await productionPool.end();
        
        console.log('\n🎉 Création terminée !');
        console.log('\n💡 Prochaines étapes:');
        console.log('1. Redémarrez l\'application: pm2 restart eb-vision-2-0');
        console.log('2. Testez la gestion des permissions via l\'interface');
        console.log('3. Les toggles de permissions devraient maintenant fonctionner !');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

createAPIPermissions().catch(console.error);











