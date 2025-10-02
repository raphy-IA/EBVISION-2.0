// Script pour associer les permissions de menu au rôle SUPER_ADMIN
require('dotenv').config();
const { Pool } = require('pg');

async function associatePermissions() {
    console.log('🔗 Association des permissions de menu au rôle SUPER_ADMIN...\n');
    
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

        console.log('\n2️⃣ Association des permissions au rôle SUPER_ADMIN...');
        
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
        
        // Récupérer toutes les permissions de menu
        const menuPermissions = await productionPool.query(`
            SELECT id, name, code FROM permissions WHERE name LIKE 'menu.%'
        `);
        
        console.log(`📋 ${menuPermissions.rows.length} permissions de menu trouvées`);
        
        let associatedCount = 0;
        
        for (const perm of menuPermissions.rows) {
            try {
                await productionPool.query(`
                    INSERT INTO role_permissions (id, role_id, permission_id, created_at, updated_at) 
                    VALUES (gen_random_uuid(), $1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                `, [roleId, perm.id]);
                
                console.log(`   ✅ ${perm.name} (${perm.code}) associée`);
                associatedCount++;
                
            } catch (error) {
                if (error.message.includes('duplicate key')) {
                    console.log(`   ⚠️ ${perm.name} - déjà associée`);
                } else {
                    console.log(`   ❌ ${perm.name} - ${error.message}`);
                }
            }
        }
        
        console.log(`\n🎯 Résultat: ${associatedCount} permissions associées au SUPER_ADMIN`);
        
        // Vérification finale
        const finalCheck = await productionPool.query(`
            SELECT COUNT(*) as count
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            JOIN roles r ON rp.role_id = r.id
            WHERE r.name = 'SUPER_ADMIN' AND p.name LIKE 'menu.%'
        `);
        
        console.log(`🔑 Permissions de menu du SUPER_ADMIN après association: ${finalCheck.rows[0].count}`);

        await productionPool.end();
        
        console.log('\n🎉 Association terminée !');
        console.log('\n💡 Prochaines étapes:');
        console.log('1. Redémarrez l\'application: pm2 restart eb-vision-2-0');
        console.log('2. Testez la page des utilisateurs');
        console.log('3. Les menus devraient maintenant rester visibles !');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

associatePermissions().catch(console.error);







