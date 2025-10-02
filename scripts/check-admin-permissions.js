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

async function checkAdminPermissions() {
    console.log('🔍 Diagnostic des permissions SUPER_ADMIN\n');
    
    try {
        // 1. Vérifier l'utilisateur admin
        console.log('1️⃣ Vérification de l\'utilisateur admin...');
        const adminUser = await pool.query(`
            SELECT id, nom, prenom, email, login, role, statut, created_at
            FROM users 
            WHERE role = 'SUPER_ADMIN' OR email = 'admin@ebvision.com'
            ORDER BY created_at DESC
        `);
        
        if (adminUser.rows.length === 0) {
            console.log('   ❌ Aucun utilisateur SUPER_ADMIN trouvé');
            return;
        }
        
        const user = adminUser.rows[0];
        console.log(`   ✅ Utilisateur trouvé: ${user.email} (${user.role})`);
        console.log(`   📋 Détails: ${user.nom} ${user.prenom}, Statut: ${user.statut}`);
        
        // 2. Vérifier les rôles existants
        console.log('\n2️⃣ Vérification des rôles...');
        const roles = await pool.query('SELECT * FROM roles ORDER BY name');
        console.log(`   📊 ${roles.rows.length} rôles trouvés:`);
        roles.rows.forEach(role => {
            console.log(`      - ${role.name}: ${role.description}`);
        });
        
        // 3. Vérifier les permissions existantes
        console.log('\n3️⃣ Vérification des permissions...');
        const permissions = await pool.query('SELECT * FROM permissions ORDER BY name');
        console.log(`   📊 ${permissions.rows.length} permissions trouvées:`);
        permissions.rows.forEach(perm => {
            console.log(`      - ${perm.name}: ${perm.description}`);
        });
        
        // 4. Vérifier les permissions attribuées au rôle SUPER_ADMIN
        console.log('\n4️⃣ Vérification des permissions du rôle SUPER_ADMIN...');
        const rolePermissions = await pool.query(`
            SELECT p.name, p.description, rp.created_at
            FROM role_permissions rp
            JOIN roles r ON rp.role_id = r.id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE r.name = 'SUPER_ADMIN'
            ORDER BY p.name
        `);
        
        console.log(`   📊 ${rolePermissions.rows.length} permissions attribuées au rôle SUPER_ADMIN:`);
        if (rolePermissions.rows.length === 0) {
            console.log('   ❌ AUCUNE PERMISSION ATTRIBUÉE !');
        } else {
            rolePermissions.rows.forEach(rp => {
                console.log(`      ✅ ${rp.name}: ${rp.description}`);
            });
        }
        
        // 5. Vérifier les permissions directes de l'utilisateur
        console.log('\n5️⃣ Vérification des permissions directes de l\'utilisateur...');
        const userPermissions = await pool.query(`
            SELECT p.name, p.description, up.created_at
            FROM user_permissions up
            JOIN permissions p ON up.permission_id = p.id
            WHERE up.user_id = $1
            ORDER BY p.name
        `, [user.id]);
        
        console.log(`   📊 ${userPermissions.rows.length} permissions directes:`);
        if (userPermissions.rows.length === 0) {
            console.log('   ℹ️  Aucune permission directe (normal si les permissions viennent du rôle)');
        } else {
            userPermissions.rows.forEach(up => {
                console.log(`      ✅ ${up.name}: ${up.description}`);
            });
        }
        
        // 6. Vérifier l'accès aux business units
        console.log('\n6️⃣ Vérification de l\'accès aux business units...');
        const businessUnits = await pool.query(`
            SELECT bu.nom, bu.description, uba.created_at
            FROM user_business_unit_access uba
            JOIN business_units bu ON uba.business_unit_id = bu.id
            WHERE uba.user_id = $1
            ORDER BY bu.nom
        `, [user.id]);
        
        console.log(`   📊 ${businessUnits.rows.length} business units accessibles:`);
        if (businessUnits.rows.length === 0) {
            console.log('   ❌ AUCUN ACCÈS AUX BUSINESS UNITS !');
        } else {
            businessUnits.rows.forEach(bu => {
                console.log(`      ✅ ${bu.nom}: ${bu.description}`);
            });
        }
        
        // 7. Résumé et recommandations
        console.log('\n📊 Résumé du diagnostic');
        console.log('=' .repeat(50));
        
        const totalPermissions = permissions.rows.length;
        const assignedPermissions = rolePermissions.rows.length;
        const accessibleBUs = businessUnits.rows.length;
        
        console.log(`Permissions totales: ${totalPermissions}`);
        console.log(`Permissions attribuées au SUPER_ADMIN: ${assignedPermissions}`);
        console.log(`Business Units accessibles: ${accessibleBUs}`);
        
        if (assignedPermissions === 0) {
            console.log('\n🔴 PROBLÈME CRITIQUE: Le SUPER_ADMIN n\'a aucune permission !');
            console.log('💡 Solution: Exécuter le script de correction des permissions');
        } else if (assignedPermissions < totalPermissions) {
            console.log('\n🟡 PROBLÈME: Le SUPER_ADMIN n\'a pas toutes les permissions');
            console.log('💡 Solution: Mettre à jour les permissions du rôle SUPER_ADMIN');
        } else {
            console.log('\n🟢 Le SUPER_ADMIN semble avoir les bonnes permissions');
        }
        
        if (accessibleBUs === 0) {
            console.log('\n🔴 PROBLÈME: Le SUPER_ADMIN n\'a accès à aucune business unit !');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error.message);
    } finally {
        await pool.end();
    }
}

checkAdminPermissions().catch(console.error);
