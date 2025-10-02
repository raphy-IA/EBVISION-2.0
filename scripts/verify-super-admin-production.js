/**
 * Script pour vérifier que l'utilisateur admin a bien le rôle SUPER_ADMIN en production
 */

const { pool } = require('../src/utils/database');

async function verifySuperAdmin() {
    console.log('🔍 Vérification du rôle SUPER_ADMIN en production...\n');
    
    try {
        // 1. Vérifier que le rôle SUPER_ADMIN existe
        const roleCheck = await pool.query(`
            SELECT id, name, description, is_system_role 
            FROM roles 
            WHERE name = 'SUPER_ADMIN'
        `);
        
        if (roleCheck.rows.length === 0) {
            console.error('❌ Le rôle SUPER_ADMIN n\'existe pas !');
            console.log('\n💡 Création du rôle SUPER_ADMIN...');
            
            const createRole = await pool.query(`
                INSERT INTO roles (name, description, is_system_role)
                VALUES ('SUPER_ADMIN', 'Super Administrateur - Accès total', true)
                RETURNING id, name
            `);
            
            console.log('✅ Rôle SUPER_ADMIN créé:', createRole.rows[0]);
        } else {
            console.log('✅ Rôle SUPER_ADMIN existe:');
            console.table(roleCheck.rows);
        }
        
        const superAdminRoleId = roleCheck.rows[0]?.id || (await pool.query(`SELECT id FROM roles WHERE name = 'SUPER_ADMIN'`)).rows[0].id;
        
        // 2. Chercher l'utilisateur admin
        const adminCheck = await pool.query(`
            SELECT id, email, nom, prenom, login
            FROM users
            WHERE email = 'admin@trs.com' OR login = 'admin'
            ORDER BY email
            LIMIT 1
        `);
        
        if (adminCheck.rows.length === 0) {
            console.error('❌ Aucun utilisateur admin trouvé !');
            return;
        }
        
        const admin = adminCheck.rows[0];
        console.log('\n👤 Utilisateur admin trouvé:');
        console.table([admin]);
        
        // 3. Vérifier ses rôles actuels
        const currentRoles = await pool.query(`
            SELECT r.id, r.name, r.description
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
        `, [admin.id]);
        
        console.log('\n📋 Rôles actuels de l\'admin:');
        if (currentRoles.rows.length === 0) {
            console.log('   Aucun rôle assigné');
        } else {
            console.table(currentRoles.rows);
        }
        
        // 4. Vérifier si SUPER_ADMIN est assigné
        const hasSuperAdmin = currentRoles.rows.some(role => role.name === 'SUPER_ADMIN');
        
        if (!hasSuperAdmin) {
            console.log('\n⚠️  L\'admin n\'a PAS le rôle SUPER_ADMIN !');
            console.log('💡 Attribution du rôle SUPER_ADMIN...');
            
            await pool.query(`
                INSERT INTO user_roles (user_id, role_id)
                VALUES ($1, $2)
                ON CONFLICT (user_id, role_id) DO NOTHING
            `, [admin.id, superAdminRoleId]);
            
            console.log('✅ Rôle SUPER_ADMIN attribué à l\'admin');
            
            // Vérifier à nouveau
            const verifyRoles = await pool.query(`
                SELECT r.name
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = $1
            `, [admin.id]);
            
            console.log('\n✅ Rôles finaux:');
            console.table(verifyRoles.rows);
        } else {
            console.log('\n✅ L\'admin a déjà le rôle SUPER_ADMIN');
        }
        
        // 5. Tester la récupération des rôles (comme le fait le frontend)
        console.log('\n🧪 Test de récupération des rôles (simulation frontend)...');
        const testRoles = await pool.query(`
            SELECT r.id, r.name, r.description
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
            ORDER BY r.name
        `, [admin.id]);
        
        console.log('Résultat API simulée:');
        console.log(JSON.stringify({ data: testRoles.rows }, null, 2));
        
        const isSuperAdmin = testRoles.rows.some(role => role.name === 'SUPER_ADMIN');
        console.log(`\n🔒 isSuperAdmin: ${isSuperAdmin}`);
        
        if (isSuperAdmin) {
            console.log('\n✅ LE BOUTON DE SYNCHRONISATION DEVRAIT ÊTRE VISIBLE !');
        } else {
            console.log('\n❌ Le bouton ne sera pas visible, problème de rôle');
        }
        
    } catch (error) {
        console.error('\n❌ Erreur:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

verifySuperAdmin();


