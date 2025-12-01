const { pool } = require('../src/utils/database');

async function removeManagerRole() {
    try {
        // Trouver l'utilisateur et le rôle
        const userResult = await pool.query(
            `SELECT id FROM users WHERE login = 'rngos1' LIMIT 1`
        );

        const roleResult = await pool.query(
            `SELECT id FROM roles WHERE name = 'MANAGER' LIMIT 1`
        );

        if (userResult.rows.length > 0 && roleResult.rows.length > 0) {
            const userId = userResult.rows[0].id;
            const roleId = roleResult.rows[0].id;

            // Supprimer l'association
            await pool.query(
                `DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2`,
                [userId, roleId]
            );

            console.log('✅ Rôle MANAGER supprimé de rngos1');
        }
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

removeManagerRole();
