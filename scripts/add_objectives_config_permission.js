const { query } = require('../src/utils/database');

async function addObjectivesConfigPermission() {
    console.log('🔐 Ajout de la permission OBJECTIVES_CONFIG_EDIT...\n');

    try {
        // 1. Vérifier si la permission existe
        console.log('📝 1. Vérification de l\'existence de la permission...');
        let permissionResult = await query(`
            SELECT id, code FROM permissions WHERE code = 'OBJECTIVES_CONFIG_EDIT'
        `);

        let permissionId;
        if (permissionResult.rows.length === 0) {
            // Créer la permission si elle n'existe pas
            console.log('   ⚠️ Permission non trouvée, création...');
            const createResult = await query(`
                INSERT INTO permissions (code, name, description, category, module)
                VALUES ('OBJECTIVES_CONFIG_EDIT', 'Édition configuration objectifs', 'Permet de modifier les configurations d''objectifs (métriques, types, unités)', 'objectives', 'objectives')
                RETURNING id
            `);
            permissionId = createResult.rows[0].id;
            console.log(`   ✅ Permission créée avec l'ID: ${permissionId}`);
        } else {
            permissionId = permissionResult.rows[0].id;
            console.log(`   ✅ Permission trouvée: ID=${permissionId}`);
        }

        // 2. Récupérer l'utilisateur actuel (rngos1)
        console.log('\n👤 2. Recherche de l\'utilisateur...');
        const userResult = await query(`
            SELECT id, login FROM users WHERE login = 'rngos1'
        `);

        if (userResult.rows.length === 0) {
            console.log('   ❌ Utilisateur "rngos1" non trouvé!');
            process.exit(1);
        }

        const userId = userResult.rows[0].id;
        console.log(`   ✅ Utilisateur trouvé: ${userResult.rows[0].login} (ID: ${userId})`);

        // 3. Vérifier si l'utilisateur a déjà la permission
        console.log('\n🔍 3. Vérification des permissions existantes...');
        const existingPermResult = await query(`
            SELECT * FROM user_permissions 
            WHERE user_id = $1 AND permission_id = $2
        `, [userId, permissionId]);

        if (existingPermResult.rows.length > 0) {
            console.log('   ℹ️ L\'utilisateur possède déjà cette permission');
        } else {
            // 4. Ajouter la permission
            console.log('\n➕ 4. Ajout de la permission à l\'utilisateur...');
            await query(`
                INSERT INTO user_permissions (user_id, permission_id)
                VALUES ($1, $2)
            `, [userId, permissionId]);
            console.log('   ✅ Permission ajoutée avec succès!');
        }

        // 5. Vérification finale
        console.log('\n✅ 5. Vérification finale...');
        const finalCheck = await query(`
            SELECT p.code, p.description
            FROM user_permissions up
            JOIN permissions p ON p.id = up.permission_id
            WHERE up.user_id = $1 AND p.code = 'OBJECTIVES_CONFIG_EDIT'
        `, [userId]);

        if (finalCheck.rows.length > 0) {
            console.log('   ✅ Permission confirmée pour l\'utilisateur!');
            console.log(`   📝 ${finalCheck.rows[0].code}: ${finalCheck.rows[0].description}`);
        }

        console.log('\n🎉 TERMINÉ ! Veuillez vous déconnecter et reconnecter pour que la permission prenne effet.');

    } catch (error) {
        console.error('\n❌ ERREUR:', error);
        process.exit(1);
    }

    process.exit(0);
}

addObjectivesConfigPermission();
