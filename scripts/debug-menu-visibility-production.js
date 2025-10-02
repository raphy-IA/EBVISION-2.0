const { pool } = require('../src/utils/database');

async function debugMenuVisibility() {
    console.log('🔍 DIAGNOSTIC VISIBILITÉ DES MENUS EN PRODUCTION');
    console.log('='.repeat(80));
    
    let client;
    try {
        client = await pool.connect();
        
        const userEmail = 'ltene@eb-partnersgroup.cm';
        
        // 1. Vérifier l'utilisateur
        console.log('\n📋 1. VÉRIFICATION DE L\'UTILISATEUR');
        console.log('-'.repeat(80));
        const userQuery = await client.query(`
            SELECT id, nom, prenom, email, role, collaborateur_id, statut, created_at
            FROM users
            WHERE email = $1
        `, [userEmail]);
        
        if (userQuery.rows.length === 0) {
            console.log('❌ Utilisateur non trouvé !');
            return;
        }
        
        const user = userQuery.rows[0];
        console.log('✅ Utilisateur trouvé:');
        console.table(user);
        
        // 2. Vérifier les rôles de l'utilisateur
        console.log('\n📋 2. RÔLES DE L\'UTILISATEUR (table user_roles)');
        console.log('-'.repeat(80));
        const rolesQuery = await client.query(`
            SELECT r.id, r.name, r.description
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
        `, [user.id]);
        
        console.log(`Nombre de rôles: ${rolesQuery.rows.length}`);
        if (rolesQuery.rows.length > 0) {
            console.table(rolesQuery.rows);
        } else {
            console.log('❌ Aucun rôle assigné dans user_roles !');
            console.log(`   Note: La colonne "role" contient: "${user.role}"`);
        }
        
        // 3. Vérifier les permissions du rôle
        console.log('\n📋 3. PERMISSIONS DES RÔLES');
        console.log('-'.repeat(80));
        if (rolesQuery.rows.length > 0) {
            for (const role of rolesQuery.rows) {
                console.log(`\n🔐 Permissions pour le rôle: ${role.name}`);
                const permsQuery = await client.query(`
                    SELECT p.code, p.name, p.category
                    FROM role_permissions rp
                    JOIN permissions p ON rp.permission_id = p.id
                    WHERE rp.role_id = $1
                    ORDER BY p.category, p.code
                `, [role.id]);
                
                console.log(`   Total: ${permsQuery.rows.length} permissions`);
                
                // Compter les permissions de menu
                const menuPerms = permsQuery.rows.filter(p => p.code.startsWith('menu.'));
                console.log(`   Permissions de menu: ${menuPerms.length}`);
                const pagePerms = permsQuery.rows.filter(p => p.code.startsWith('page.'));
                console.log(`   Permissions de page: ${pagePerms.length}`);
                
                if (menuPerms.length > 0) {
                    console.log('\n   📋 Détail des permissions de menu:');
                    menuPerms.forEach(p => {
                        console.log(`      ✓ ${p.code}: ${p.name}`);
                    });
                } else {
                    console.log('\n   ❌ AUCUNE permission de menu assignée !');
                }
            }
        } else {
            console.log('⚠️ Impossible de vérifier les permissions (aucun rôle dans user_roles)');
        }
        
        // 4. Vérifier les tables menu_sections et menu_items
        console.log('\n📋 4. STRUCTURE DES MENUS DANS LA BASE');
        console.log('-'.repeat(80));
        
        const sectionsQuery = await client.query(`
            SELECT id, name, code FROM menu_sections ORDER BY name
        `);
        console.log(`\nSections de menu: ${sectionsQuery.rows.length}`);
        if (sectionsQuery.rows.length > 0) {
            console.log('Exemples:');
            console.table(sectionsQuery.rows.slice(0, 5));
        } else {
            console.log('❌ Aucune section de menu trouvée !');
        }
        
        const itemsQuery = await client.query(`
            SELECT COUNT(*) as count FROM menu_items
        `);
        console.log(`\nItems de menu: ${itemsQuery.rows[0].count}`);
        
        // 5. Vérifier les permissions de menu dans la base
        console.log('\n📋 5. PERMISSIONS DE MENU DANS LA BASE');
        console.log('-'.repeat(80));
        const menuPermissionsQuery = await client.query(`
            SELECT COUNT(*) as count
            FROM permissions
            WHERE code LIKE 'menu.%'
        `);
        console.log(`Total de permissions de menu: ${menuPermissionsQuery.rows[0].count}`);
        
        if (parseInt(menuPermissionsQuery.rows[0].count) > 0) {
            const examplesQuery = await client.query(`
                SELECT code, name, category
                FROM permissions
                WHERE code LIKE 'menu.%'
                ORDER BY code
                LIMIT 10
            `);
            console.log('\nExemples:');
            console.table(examplesQuery.rows);
        } else {
            console.log('❌ Aucune permission de menu trouvée !');
        }
        
        // 6. Recommandations
        console.log('\n📋 6. DIAGNOSTIC ET RECOMMANDATIONS');
        console.log('-'.repeat(80));
        
        const sectionsCount = parseInt(sectionsQuery.rows.length);
        const itemsCount = parseInt(itemsQuery.rows[0].count);
        const menuPermsCount = parseInt(menuPermissionsQuery.rows[0].count);
        
        if (sectionsCount === 0 || itemsCount === 0 || menuPermsCount === 0) {
            console.log('❌ PROBLÈME #1: Les menus ne sont pas synchronisés en base');
            console.log('\n🔧 SOLUTION IMMÉDIATE:');
            console.log('   Exécutez: node scripts/manual-sync-permissions-menus.js');
            console.log('\n   OU depuis l\'interface web:');
            console.log('   1. Connectez-vous en tant que SUPER_ADMIN');
            console.log('   2. Allez sur /permissions-admin.html');
            console.log('   3. Cliquez sur "Synchroniser Permissions & Menus"');
        } else if (rolesQuery.rows.length === 0) {
            console.log('❌ PROBLÈME #2: L\'utilisateur n\'a aucun rôle dans user_roles');
            console.log('\n🔧 SOLUTION:');
            console.log('   1. Sur /users.html, cherchez l\'utilisateur');
            console.log('   2. Cliquez sur "Gérer le compte utilisateur"');
            console.log('   3. Cochez le rôle "COLLABORATEUR"');
            console.log('   4. Sauvegardez');
        } else {
            // Vérifier si le rôle a des permissions de menu
            let hasMenuPerms = false;
            for (const role of rolesQuery.rows) {
                const permsQuery = await client.query(`
                    SELECT COUNT(*) as count
                    FROM role_permissions rp
                    JOIN permissions p ON rp.permission_id = p.id
                    WHERE rp.role_id = $1 AND p.code LIKE 'menu.%'
                `, [role.id]);
                
                if (parseInt(permsQuery.rows[0].count) > 0) {
                    hasMenuPerms = true;
                }
            }
            
            if (!hasMenuPerms) {
                console.log('❌ PROBLÈME #3: Le rôle COLLABORATEUR n\'a aucune permission de menu');
                console.log('\n🔧 SOLUTION:');
                console.log('   1. Sur /permissions-admin.html');
                console.log('   2. Onglet "Permissions de Menu"');
                console.log('   3. Sélectionnez le rôle "COLLABORATEUR"');
                console.log('   4. Cochez les menus nécessaires (au minimum "Dashboard")');
                console.log('   5. Sauvegardez');
            } else {
                console.log('✅ La configuration en base semble correcte !');
                console.log('\n🔍 Vérifications côté frontend à faire:');
                console.log('   1. Videz le cache du navigateur (Ctrl+Shift+F5)');
                console.log('   2. Ouvrez la console navigateur (F12)');
                console.log('   3. Vérifiez s\'il y a des erreurs JavaScript');
                console.log('   4. Vérifiez que sidebar.js charge correctement');
                console.log('   5. Déconnectez/reconnectez l\'utilisateur');
            }
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ Diagnostic terminé');
        
    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error);
    } finally {
        if (client) {
            client.release();
        }
        process.exit(0);
    }
}

debugMenuVisibility();
