const { pool } = require('../src/utils/database');

async function createCollaborateurPermissions() {
    try {
        const permissions = [
            {
                code: 'COLLABORATEUR_CREATE',
                name: 'Créer un collaborateur',
                category: 'GESTION_RH',
                module: 'COLLABORATEURS'
            },
            {
                code: 'COLLABORATEUR_EDIT',
                name: 'Modifier un collaborateur',
                category: 'GESTION_RH',
                module: 'COLLABORATEURS'
            }
        ];

        for (const perm of permissions) {
            // Vérifier si existe déjà
            const checkResult = await pool.query(
                'SELECT id, code FROM permissions WHERE code = $1',
                [perm.code]
            );

            if (checkResult.rows.length > 0) {
                console.log(`ℹ️  Permission ${perm.code} existe déjà`);
            } else {
                // Créer la permission
                const result = await pool.query(
                    `INSERT INTO permissions (code, name, category, module, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, NOW(), NOW())
                     RETURNING id, code`,
                    [perm.code, perm.name, perm.category, perm.module]
                );
                console.log(`✅ Permission créée: ${result.rows[0].code} (ID: ${result.rows[0].id})`);
            }
        }

        console.log('\n✅ Permissions collaborateurs configurées');
        console.log('\n📝 Prochaine étape:');
        console.log('   1. Aller sur /permissions-admin.html');
        console.log('   2. Assigner ces permissions aux rôles appropriés');
        console.log('   3. Ou les assigner directement à des utilisateurs');

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

createCollaborateurPermissions();
