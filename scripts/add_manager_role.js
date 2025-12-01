const { pool } = require('../src/utils/database');

async function addManagerRoleToUser() {
    try {
        // 1. Trouver l'utilisateur rngos1
        const userResult = await pool.query(
            `SELECT id, login FROM users WHERE login = 'rngos1' LIMIT 1`
        );

        if (userResult.rows.length === 0) {
            console.log('❌ Utilisateur rngos1 non trouvé');
            return;
        }

        const userId = userResult.rows[0].id;
        console.log(`✅ Utilisateur trouvé: ${userResult.rows[0].login} (ID: ${userId})`);

        // 2. Trouver le rôle MANAGER
        const roleResult = await pool.query(
            `SELECT id, name FROM roles WHERE name = 'MANAGER' LIMIT 1`
        );

        if (roleResult.rows.length === 0) {
            console.log('❌ Rôle MANAGER non trouvé dans la BDD');
            return;
        }

        const roleId = roleResult.rows[0].id;
        console.log(`✅ Rôle trouvé: ${roleResult.rows[0].name} (ID: ${roleId})`);

        // 3. Vérifier si l'association existe déjà
        const checkResult = await pool.query(
            `SELECT * FROM user_roles WHERE user_id = $1 AND role_id = $2`,
            [userId, roleId]
        );

        if (checkResult.rows.length > 0) {
            console.log(`ℹ️  L'utilisateur a déjà le rôle MANAGER`);
        } else {
            // 4. Ajouter l'association
            await pool.query(
                `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
                [userId, roleId]
            );
            console.log(`✅ Rôle MANAGER ajouté à l'utilisateur rngos1`);
        }

        // 5. Afficher tous les rôles de l'utilisateur
        const allRolesResult = await pool.query(
            `SELECT r.id, r.name
             FROM user_roles ur
             JOIN roles r ON ur.role_id = r.id
             WHERE ur.user_id = $1`,
            [userId]
        );

        console.log(`\n👤 Rôles actuels de rngos1:`);
        allRolesResult.rows.forEach(role => {
            console.log(`   ✓ ${role.name}`);
        });

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

addManagerRoleToUser();
