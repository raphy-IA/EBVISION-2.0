const { pool } = require('../../src/utils/database');

async function createAPIPermissions() {
    const client = await pool.connect();

    try {
        console.log('\n📋 Création des permissions API manquantes...\n');

        // Permissions nécessaires pour les API
        const permissions = [
            { code: 'users:read', name: 'Lire les utilisateurs', description: 'Permission de lecture des utilisateurs via API', category: 'api' },
            { code: 'users:create', name: 'Créer des utilisateurs', description: 'Permission de création d\'utilisateurs via API', category: 'api' },
            { code: 'users:update', name: 'Modifier des utilisateurs', description: 'Permission de modification d\'utilisateurs via API', category: 'api' },
            { code: 'users:delete', name: 'Supprimer des utilisateurs', description: 'Permission de suppression d\'utilisateurs via API', category: 'api' }
        ];

        for (const perm of permissions) {
            const result = await client.query(`
                INSERT INTO permissions (code, name, description, category)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (code) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    category = EXCLUDED.category
                RETURNING id, code
            `, [perm.code, perm.name, perm.description, perm.category]);

            console.log(`  ✅ ${perm.code.padEnd(20)} - ${perm.name}`);
        }

        console.log('\n📊 Attribution des permissions au rôle SUPER_ADMIN...\n');

        // Attribuer ces permissions au rôle SUPER_ADMIN
        const superAdminRole = await client.query(`
            SELECT id FROM roles WHERE name = 'SUPER_ADMIN'
        `);

        if (superAdminRole.rows.length > 0) {
            const roleId = superAdminRole.rows[0].id;

            for (const perm of permissions) {
                await client.query(`
                    INSERT INTO role_permissions (role_id, permission_id)
                    SELECT $1, id FROM permissions WHERE code = $2
                    ON CONFLICT (role_id, permission_id) DO NOTHING
                `, [roleId, perm.code]);
            }

            console.log(`  ✅ Permissions ajoutées au rôle SUPER_ADMIN\n`);
        } else {
            console.log(`  ⚠️  Rôle SUPER_ADMIN non trouvé\n`);
        }

        console.log('✅ Terminé!\n');

    } catch (e) {
        console.error('❌ Erreur:', e.message);
    } finally {
        client.release();
        pool.end();
    }
}

createAPIPermissions();
