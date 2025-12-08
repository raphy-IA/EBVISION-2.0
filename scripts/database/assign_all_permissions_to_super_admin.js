const { pool } = require('../../src/utils/database');

/**
 * Attribution de TOUTES les permissions existantes au rôle SUPER_ADMIN
 * Ce script doit être exécuté :
 * - Après l'initialisation de la base (0-init-complete.js)
 * - Après l'import de nouvelles permissions
 * - Après la création manuelle de permissions
 */

async function assignAllPermissionsToSuperAdmin() {
    const client = await pool.connect();

    try {
        console.log('\n📋 ATTRIBUTION DE TOUTES LES PERMISSIONS AU SUPER_ADMIN\n');
        console.log('='.repeat(70) + '\n');

        // 1. Trouver le rôle SUPER_ADMIN
        const roleResult = await client.query(`
            SELECT id, name FROM roles WHERE name = 'SUPER_ADMIN'
        `);

        if (roleResult.rows.length === 0) {
            console.error('❌ Rôle SUPER_ADMIN non trouvé !');
            console.log('   Assurez-vous que le rôle existe dans la table roles.\n');
            return;
        }

        const superAdminRoleId = roleResult.rows[0].id;
        console.log(`✅ Rôle SUPER_ADMIN trouvé (ID: ${superAdminRoleId})\n`);

        // 2. Compter toutes les permissions existantes
        const allPermissionsResult = await client.query(`
            SELECT id, code, name, category 
            FROM permissions 
            ORDER BY category, code
        `);

        const totalPermissions = allPermissionsResult.rows.length;
        console.log(`📊 Total de permissions dans la base: ${totalPermissions}\n`);

        // 3. Vérifier combien sont déjà assignées
        const assignedResult = await client.query(`
            SELECT COUNT(*) as count
            FROM role_permissions
            WHERE role_id = $1
        `, [superAdminRoleId]);

        const alreadyAssigned = parseInt(assignedResult.rows[0].count);
        console.log(`✅ Permissions déjà assignées: ${alreadyAssigned}\n`);

        // 4. Assigner TOUTES les permissions au SUPER_ADMIN
        console.log('🔄 Attribution des permissions...\n');

        let newAssignments = 0;
        let skippedDuplicates = 0;

        // Grouper par catégorie pour un affichage plus clair
        const permissionsByCategory = {};
        allPermissionsResult.rows.forEach(perm => {
            const cat = perm.category || 'other';
            if (!permissionsByCategory[cat]) {
                permissionsByCategory[cat] = [];
            }
            permissionsByCategory[cat].push(perm);
        });

        // Assigner par catégorie
        for (const [category, permissions] of Object.entries(permissionsByCategory)) {
            const catLabel = category.toUpperCase().padEnd(15);
            process.stdout.write(`   ${catLabel} `);

            for (const perm of permissions) {
                const insertResult = await client.query(`
                    INSERT INTO role_permissions (role_id, permission_id)
                    VALUES ($1, $2)
                    ON CONFLICT (role_id, permission_id) DO NOTHING
                    RETURNING *
                `, [superAdminRoleId, perm.id]);

                if (insertResult.rows.length > 0) {
                    newAssignments++;
                    process.stdout.write('✅');
                } else {
                    skippedDuplicates++;
                    process.stdout.write('⊙');
                }
            }

            console.log(` (${permissions.length})`);
        }

        console.log('\n' + '='.repeat(70));
        console.log('📊 RÉSUMÉ\n');
        console.log(`   Total permissions: ${totalPermissions}`);
        console.log(`   Nouvelles assignations: ${newAssignments}`);
        console.log(`   Déjà assignées (ignorées): ${skippedDuplicates}`);
        console.log(`   Total assignées maintenant: ${alreadyAssigned + newAssignments}`);
        console.log('\n' + '='.repeat(70));

        if (newAssignments > 0) {
            console.log(`\n✅ ${newAssignments} nouvelles permissions assignées au SUPER_ADMIN\n`);
        } else {
            console.log('\n✅ Toutes les permissions étaient déjà assignées au SUPER_ADMIN\n');
        }

        // 5. Détail des permissions par catégorie
        console.log('📋 DÉTAIL DES PERMISSIONS PAR CATÉGORIE:\n');
        for (const [category, permissions] of Object.entries(permissionsByCategory)) {
            console.log(`   ${category.toUpperCase()}: ${permissions.length} permissions`);
            if (category === 'api' || category === 'page') {
                console.log(`      Exemples: ${permissions.slice(0, 3).map(p => p.code).join(', ')}...`);
            }
        }
        console.log();

    } catch (e) {
        console.error('❌ Erreur:', e.message);
        console.error(e.stack);
    } finally {
        client.release();
        pool.end();
    }
}

assignAllPermissionsToSuperAdmin();
