const { pool } = require('../src/utils/database');

async function checkUserRoles() {
    try {
        // Trouver l'utilisateur rngos1
        const userResult = await pool.query(
            `SELECT id, login, nom, prenom 
             FROM users 
             WHERE login = 'rngos1' 
             LIMIT 1`
        );

        if (userResult.rows.length === 0) {
            console.log('❌ Utilisateur rngos1 non trouvé');
            return;
        }

        const user = userResult.rows[0];
        console.log('✅ Utilisateur trouvé:', user);

        // Récupérer ses rôles
        const rolesResult = await pool.query(
            `SELECT ur.user_id, r.id as role_id, r.code, r.name
             FROM user_roles ur
             JOIN roles r ON ur.role_id = r.id
             WHERE ur.user_id = $1`,
            [user.id]
        );

        console.log(`\n👤 Rôles pour ${user.login}:`);
        if (rolesResult.rows.length === 0) {
            console.log('❌ Aucun rôle assigné !');
        } else {
            rolesResult.rows.forEach(role => {
                console.log(`   ✓ ${role.code} - ${role.name}`);
            });
        }

        // Chercher le rôle MANAGER
        const managerRole = await pool.query(
            `SELECT id, code, name 
             FROM roles 
             WHERE code = 'MANAGER'
             LIMIT 1`
        );

        if (managerRole.rows.length === 0) {
            console.log('\n⚠️  Rôle MANAGER n\'existe pas dans la BDD !');
        } else {
            console.log('\n✅ Rôle MANAGER existe:', managerRole.rows[0]);

            const hasManager = rolesResult.rows.some(r => r.code === 'MANAGER');
            if (!hasManager) {
                console.log('\n❌ L\'utilisateur rngos1 N\'A PAS le rôle MANAGER');
                console.log('💡 Solution: Ajouter le rôle MANAGER à rngos1');
            } else {
                console.log('\n✅ L\'utilisateur rngos1 A le rôle MANAGER');
            }
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkUserRoles();
