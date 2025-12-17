const pool = require('../../src/utils/database').pool;

async function cleanupDuplicatePermissions() {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        console.log('🔍 Recherche des permissions en double par nom...\n');

        // Trouver les permissions avec le même nom mais des codes différents
        const duplicatesQuery = `
            WITH duplicates AS (
                SELECT 
                    name,
                    COUNT(*) as count,
                    ARRAY_AGG(id ORDER BY created_at, id) as ids,
                    ARRAY_AGG(code ORDER BY created_at, id) as codes
                FROM permissions
                WHERE category = 'navigation'
                GROUP BY name
                HAVING COUNT(*) > 1
            )
            SELECT * FROM duplicates
            ORDER BY count DESC, name;
        `;

        const duplicatesResult = await client.query(duplicatesQuery);

        if (duplicatesResult.rows.length === 0) {
            console.log('✅ Aucune permission en double trouvée!');
            await client.query('COMMIT');
            return;
        }

        console.log(`❌ ${duplicatesResult.rows.length} permissions en double trouvées\n`);

        let totalDeleted = 0;
        let totalMigrated = 0;

        for (const dup of duplicatesResult.rows) {
            console.log(`\n📝 Traitement: "${dup.name}" (${dup.count} occurrences)`);
            console.log(`   Codes: ${dup.codes.join(', ')}`);

            // Garder la première permission (la plus ancienne)
            const keepId = dup.ids[0];
            const deleteIds = dup.ids.slice(1);

            console.log(`   ✅ Conserver: ${dup.codes[0]} (ID: ${keepId})`);
            console.log(`   ❌ Supprimer: ${deleteIds.length} doublons`);

            // Migrer les associations role_permissions vers la permission conservée
            for (const deleteId of deleteIds) {
                // Vérifier s'il y a des associations à migrer
                const checkAssoc = await client.query(
                    'SELECT COUNT(*) as count FROM role_permissions WHERE permission_id = $1',
                    [deleteId]
                );

                if (parseInt(checkAssoc.rows[0].count) > 0) {
                    console.log(`   🔄 Migration de ${checkAssoc.rows[0].count} association(s) de rôle...`);

                    // Migrer les associations qui n'existent pas déjà pour la permission conservée
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

                    totalMigrated += parseInt(checkAssoc.rows[0].count);
                }

                // Migrer les associations user_permissions vers la permission conservée
                const checkUserAssoc = await client.query(
                    'SELECT COUNT(*) as count FROM user_permissions WHERE permission_id = $1',
                    [deleteId]
                );

                if (parseInt(checkUserAssoc.rows[0].count) > 0) {
                    console.log(`   🔄 Migration de ${checkUserAssoc.rows[0].count} permission(s) utilisateur...`);

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

                    totalMigrated += parseInt(checkUserAssoc.rows[0].count);
                }

                // Supprimer les anciennes associations
                await client.query('DELETE FROM role_permissions WHERE permission_id = $1', [deleteId]);
                await client.query('DELETE FROM user_permissions WHERE permission_id = $1', [deleteId]);

                // Supprimer la permission en double
                await client.query('DELETE FROM permissions WHERE id = $1', [deleteId]);
                totalDeleted++;
            }
        }

        await client.query('COMMIT');

        console.log('\n\n✅ Nettoyage terminé avec succès!');
        console.log(`📊 Statistiques:`);
        console.log(`   - Permissions supprimées: ${totalDeleted}`);
        console.log(`   - Associations migrées: ${totalMigrated}`);
        console.log(`   - Permissions conservées: ${duplicatesResult.rows.length}`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erreur lors du nettoyage:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

cleanupDuplicatePermissions();
