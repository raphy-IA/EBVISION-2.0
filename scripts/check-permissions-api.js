// Script pour diagnostiquer l'API des permissions
require('dotenv').config();
const { Pool } = require('pg');

async function checkPermissionsAPI() {
    console.log('🔍 Diagnostic de l\'API des permissions...\n');
    
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

        console.log('\n2️⃣ Vérification des tables de permissions...');
        
        // Vérifier la structure des tables
        const tables = ['permissions', 'roles', 'role_permissions', 'user_permissions'];
        
        for (const table of tables) {
            try {
                const count = await productionPool.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`   📊 ${table}: ${count.rows[0].count} enregistrements`);
                
                // Vérifier la structure
                const structure = await productionPool.query(`
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = $1 
                    ORDER BY ordinal_position
                `, [table]);
                
                console.log(`   📋 Structure de ${table}:`);
                structure.rows.forEach(col => {
                    console.log(`      - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'})`);
                });
                
            } catch (error) {
                console.log(`   ❌ Erreur avec ${table}: ${error.message}`);
            }
        }

        console.log('\n3️⃣ Vérification des permissions de menu...');
        
        const menuPermissions = await productionPool.query(`
            SELECT p.id, p.name, p.code, rp.role_id, r.name as role_name
            FROM permissions p
            LEFT JOIN role_permissions rp ON p.id = rp.permission_id
            LEFT JOIN roles r ON rp.role_id = r.id
            WHERE p.name LIKE 'menu.%'
            ORDER BY p.name
        `);
        
        console.log(`📋 ${menuPermissions.rows.length} permissions de menu trouvées:`);
        menuPermissions.rows.forEach(perm => {
            const roleInfo = perm.role_name ? `✅ ${perm.role_name}` : '❌ Aucun rôle';
            console.log(`   - ${perm.name} (${perm.code}): ${roleInfo}`);
        });

        console.log('\n4️⃣ Vérification des rôles et leurs permissions...');
        
        const rolesWithPermissions = await productionPool.query(`
            SELECT r.id, r.name, COUNT(rp.permission_id) as permission_count
            FROM roles r
            LEFT JOIN role_permissions rp ON r.id = rp.role_id
            GROUP BY r.id, r.name
            ORDER BY r.name
        `);
        
        console.log('📊 Rôles et leurs permissions:');
        rolesWithPermissions.rows.forEach(role => {
            console.log(`   - ${role.name}: ${role.permission_count} permissions`);
        });

        console.log('\n5️⃣ Test de l\'endpoint API...');
        
        // Vérifier si l'endpoint existe dans la base
        const apiEndpoints = await productionPool.query(`
            SELECT DISTINCT p.name, p.code
            FROM permissions p
            WHERE p.name LIKE 'api.%' OR p.name LIKE 'permission.%'
            ORDER BY p.name
        `);
        
        console.log(`🔌 Endpoints API trouvés: ${apiEndpoints.rows.length}`);
        apiEndpoints.rows.forEach(endpoint => {
            console.log(`   - ${endpoint.name} (${endpoint.code})`);
        });

        await productionPool.end();
        
        console.log('\n🎯 DIAGNOSTIC TERMINÉ');
        console.log('\n💡 Prochaines étapes:');
        console.log('1. Vérifiez les logs du serveur pour l\'erreur 500');
        console.log('2. Assurez-vous que l\'utilisateur a les permissions nécessaires');
        console.log('3. Vérifiez que l\'endpoint /api/permissions/roles/... existe');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

checkPermissionsAPI().catch(console.error);









