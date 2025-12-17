const pool = require('../../src/utils/database').pool;

async function cleanupOpportunitiesMissions() {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        console.log('🔍 Nettoyage des duplications Opportunities et Missions...\n');

        // Définir les duplications à nettoyer
        // Format: [category, keepCode, deleteCode, name]
        const duplicatesToClean = [
            // Opportunities
            ['opportunities', 'opportunities.create', 'opportunities:create', 'Créer opportunités'],
            ['opportunities', 'opportunities.edit', 'opportunities:update', 'Modifier opportunités'],
            ['opportunities', 'opportunities.delete', 'opportunities:delete', 'Supprimer opportunités'],
            ['opportunities', 'opportunities.view', 'opportunities:read', 'Voir opportunités'],

            // Missions
            ['missions', 'missions.create', 'missions:create', 'Créer missions'],
            ['missions', 'missions.edit', 'missions:update', 'Modifier missions'],
            ['missions', 'missions.delete', 'missions:delete', 'Supprimer missions'],
            ['missions', 'missions.view', 'missions:read', 'Voir missions']
        ];

        let totalDeleted = 0;
        let totalMigrated = 0;

        for (const [category, keepCode, deleteCode, actionName] of duplicatesToClean) {
            console.log(`\n📝 [${category}] ${actionName}`);

            // Trouver les IDs des permissions
            const keepResult = await client.query(
                'SELECT id, name FROM permissions WHERE code = $1 AND category = $2',
                [keepCode, category]
            );

            const deleteResult = await client.query(
                'SELECT id, name FROM permissions WHERE code = $1 AND category = $2',
                [deleteCode, category]
            );

            if (keepResult.rows.length === 0) {
                console.log(`   ⚠️  Permission à conserver introuvable: ${keepCode}`);
                continue;
            }

            if (deleteResult.rows.length === 0) {
                console.log(`   ℹ️  Permission à supprimer déjà absente: ${deleteCode}`);
                continue;
            }

            const keepId = keepResult.rows[0].id;
            const deleteId = deleteResult.rows[0].id;

            console.log(`   ✅ Conserver: "${keepResult.rows[0].name}" (${keepCode})`);
            console.log(`   ❌ Supprimer: "${deleteResult.rows[0].name}" (${deleteCode})`);

            // Migrer les associations role_permissions
            const roleAssocCount = await client.query(
                'SELECT COUNT(*) as count FROM role_permissions WHERE permission_id = $1',
                [deleteId]
            );

            if (parseInt(roleAssocCount.rows[0].count) > 0) {
                console.log(`   🔄 Migration de ${roleAssocCount.rows[0].count} association(s) de rôle...`);

                await client.query(`
                    INSERT INTO role_permissions (role_id, permission_id)
                    SELECT rp.role_id, $1
                    FROM role_permissions rp
                    WHERE rp.permission_id = $2
                    AND NOT EXISTS (
                        SELECT 1 FROM role_permissions rp2
                        WHERE rp2.role_id = rp.role_id
                        AND rp2.permission_id = $1
                    )
                `, [keepId, deleteId]);

                totalMigrated += parseInt(roleAssocCount.rows[0].count);
            }

            // Migrer les associations user_permissions
            const userAssocCount = await client.query(
                'SELECT COUNT(*) as count FROM user_permissions WHERE permission_id = $1',
                [deleteId]
            );

            if (parseInt(userAssocCount.rows[0].count) > 0) {
                console.log(`   🔄 Migration de ${userAssocCount.rows[0].count} permission(s) utilisateur...`);

                await client.query(`
                    INSERT INTO user_permissions (user_id, permission_id)
                    SELECT up.user_id, $1
                    FROM user_permissions up
                    WHERE up.permission_id = $2
                    AND NOT EXISTS (
                        SELECT 1 FROM user_permissions up2
                        WHERE up2.user_id = up.user_id
                        AND up2.permission_id = $1
                    )
                `, [keepId, deleteId]);

                totalMigrated += parseInt(userAssocCount.rows[0].count);
            }

            // Supprimer les anciennes associations
            await client.query('DELETE FROM role_permissions WHERE permission_id = $1', [deleteId]);
            await client.query('DELETE FROM user_permissions WHERE permission_id = $1', [deleteId]);

            // Supprimer la permission en double
            await client.query('DELETE FROM permissions WHERE id = $1', [deleteId]);
            totalDeleted++;

            console.log(`   ✅ Nettoyage terminé`);
        }

        await client.query('COMMIT');

        console.log('\n\n✅ Nettoyage Opportunities/Missions terminé avec succès!');
        console.log(`📊 Statistiques:`);
        console.log(`   - Permissions supprimées: ${totalDeleted}`);
        console.log(`   - Associations migrées: ${totalMigrated}`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erreur lors du nettoyage:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

cleanupOpportunitiesMissions();
