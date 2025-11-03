// Charger les variables d'environnement
require('dotenv').config();

const { Pool } = require('pg');

// Configuration de la base de données
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

async function fixAdminPermissions() {
    console.log('🔧 Correction des permissions SUPER_ADMIN\n');
    
    try {
        // 1. Trouver l'utilisateur admin
        console.log('1️⃣ Recherche de l\'utilisateur admin...');
        const adminUser = await pool.query(`
            SELECT id, nom, prenom, email, login, role, statut
            FROM users 
            WHERE role = 'SUPER_ADMIN' OR email = 'admin@ebvision.com'
            ORDER BY created_at DESC
            LIMIT 1
        `);
        
        if (adminUser.rows.length === 0) {
            console.log('   ❌ Aucun utilisateur SUPER_ADMIN trouvé');
            return;
        }
        
        const user = adminUser.rows[0];
        console.log(`   ✅ Utilisateur trouvé: ${user.email} (${user.role})`);
        
        // 2. Activer l'utilisateur s'il est inactif
        if (user.statut === 'INACTIF') {
            console.log('\n2️⃣ Activation de l\'utilisateur...');
            await pool.query(`
                UPDATE users 
                SET statut = 'ACTIF', updated_at = NOW()
                WHERE id = $1
            `, [user.id]);
            console.log('   ✅ Utilisateur activé');
        } else {
            console.log('\n2️⃣ Utilisateur déjà actif');
        }
        
        // 3. S'assurer que le rôle SUPER_ADMIN existe
        console.log('\n3️⃣ Vérification/création du rôle SUPER_ADMIN...');
        let superAdminRole = await pool.query(`
            SELECT id, name, description FROM roles WHERE name = 'SUPER_ADMIN'
        `);
        
        if (superAdminRole.rows.length === 0) {
            console.log('   ⚠️  Rôle SUPER_ADMIN non trouvé, création...');
            const newRole = await pool.query(`
                INSERT INTO roles (id, name, description, created_at, updated_at)
                VALUES (gen_random_uuid(), 'SUPER_ADMIN', 'Administrateur système avec tous les droits', NOW(), NOW())
                RETURNING id, name, description
            `);
            superAdminRole = newRole;
            console.log('   ✅ Rôle SUPER_ADMIN créé');
        } else {
            console.log('   ✅ Rôle SUPER_ADMIN existant');
        }
        
        const roleId = superAdminRole.rows[0].id;
        
        // 4. Mettre à jour l'utilisateur pour s'assurer qu'il a le bon rôle
        console.log('\n4️⃣ Mise à jour du rôle de l\'utilisateur...');
        await pool.query(`
            UPDATE users 
            SET role = 'SUPER_ADMIN', updated_at = NOW()
            WHERE id = $1
        `, [user.id]);
        console.log('   ✅ Rôle utilisateur mis à jour vers SUPER_ADMIN');
        
        // 5. Supprimer toutes les permissions existantes du rôle SUPER_ADMIN
        console.log('\n5️⃣ Nettoyage des permissions existantes...');
        await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
        console.log('   ✅ Permissions existantes supprimées');
        
        // 6. Récupérer toutes les permissions disponibles
        console.log('\n6️⃣ Récupération de toutes les permissions...');
        const allPermissions = await pool.query('SELECT id, name, description FROM permissions ORDER BY name');
        console.log(`   📊 ${allPermissions.rows.length} permissions trouvées`);
        
        // 7. Attribuer TOUTES les permissions au rôle SUPER_ADMIN
        console.log('\n7️⃣ Attribution de toutes les permissions au SUPER_ADMIN...');
        for (const permission of allPermissions.rows) {
            await pool.query(`
                INSERT INTO role_permissions (id, role_id, permission_id, created_at)
                VALUES (gen_random_uuid(), $1, $2, NOW())
            `, [roleId, permission.id]);
            console.log(`   ✅ Permission attribuée: ${permission.name}`);
        }
        
        // 8. Récupérer toutes les business units
        console.log('\n8️⃣ Récupération de toutes les business units...');
        const allBusinessUnits = await pool.query('SELECT id, nom, description FROM business_units ORDER BY nom');
        console.log(`   📊 ${allBusinessUnits.rows.length} business units trouvées`);
        
        // 9. Supprimer les accès existants aux business units
        console.log('\n9️⃣ Nettoyage des accès business units existants...');
        await pool.query('DELETE FROM user_business_unit_access WHERE user_id = $1', [user.id]);
        console.log('   ✅ Accès business units existants supprimés');
        
        // 10. Donner accès à TOUTES les business units
        console.log('\n🔟 Attribution de l\'accès à toutes les business units...');
        for (const bu of allBusinessUnits.rows) {
            await pool.query(`
                INSERT INTO user_business_unit_access (id, user_id, business_unit_id, created_at)
                VALUES (gen_random_uuid(), $1, $2, NOW())
            `, [user.id, bu.id]);
            console.log(`   ✅ Accès accordé: ${bu.nom}`);
        }
        
        // 11. Vérification finale
        console.log('\n🔍 Vérification finale...');
        
        const finalRolePermissions = await pool.query(`
            SELECT COUNT(*) as count
            FROM role_permissions rp
            JOIN roles r ON rp.role_id = r.id
            WHERE r.name = 'SUPER_ADMIN'
        `);
        
        const finalUserBUs = await pool.query(`
            SELECT COUNT(*) as count
            FROM user_business_unit_access uba
            WHERE uba.user_id = $1
        `, [user.id]);
        
        const finalUserStatus = await pool.query(`
            SELECT statut FROM users WHERE id = $1
        `, [user.id]);
        
        console.log(`   📊 Permissions finales: ${finalRolePermissions.rows[0].count}`);
        console.log(`   📊 Business Units accessibles: ${finalUserBUs.rows[0].count}`);
        console.log(`   📊 Statut utilisateur: ${finalUserStatus.rows[0].statut}`);
        
        // 12. Résumé
        console.log('\n🎉 Correction terminée avec succès !');
        console.log('=' .repeat(50));
        console.log(`✅ Utilisateur: ${user.email}`);
        console.log(`✅ Rôle: SUPER_ADMIN`);
        console.log(`✅ Statut: ${finalUserStatus.rows[0].statut}`);
        console.log(`✅ Permissions: ${finalRolePermissions.rows[0].count} attribuées`);
        console.log(`✅ Business Units: ${finalUserBUs.rows[0].count} accessibles`);
        console.log('\n💡 Le SUPER_ADMIN a maintenant accès à tout dans l\'application !');
        console.log('🔄 Redémarrez l\'application si nécessaire pour que les changements prennent effet.');
        
    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        await pool.end();
    }
}

fixAdminPermissions().catch(console.error);
