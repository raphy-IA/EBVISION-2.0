const { pool } = require('../src/utils/database');

async function updateUsersRoleConstraint() {
    let client;
    try {
        console.log('🔄 Mise à jour de la contrainte users_role_check...');
        client = await pool.connect();
        
        // 1. Récupérer tous les rôles existants
        console.log('📋 Récupération des rôles depuis la table roles...');
        const rolesResult = await client.query('SELECT name FROM roles ORDER BY name');
        const roles = rolesResult.rows.map(row => row.name);
        
        console.log('📊 Rôles trouvés:', roles);
        
        // 2. Supprimer l'ancienne contrainte
        console.log('🗑️ Suppression de l\'ancienne contrainte...');
        await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
        
        // 3. Créer la nouvelle contrainte avec tous les rôles
        console.log('✅ Création de la nouvelle contrainte...');
        const roleValues = roles.map(role => `'${role}'`).join(', ');
        const constraintQuery = `
            ALTER TABLE users 
            ADD CONSTRAINT users_role_check 
            CHECK (role IN (${roleValues}))
        `;
        
        await client.query(constraintQuery);
        
        console.log('✅ Contrainte mise à jour avec succès !');
        console.log('📋 Rôles autorisés:', roles);
        
        // 4. Vérifier que la contrainte fonctionne
        console.log('🔍 Test de la contrainte...');
        const testQuery = `
            SELECT role, COUNT(*) as count 
            FROM users 
            GROUP BY role 
            ORDER BY role
        `;
        const testResult = await client.query(testQuery);
        
        console.log('📊 Rôles actuellement utilisés:');
        testResult.rows.forEach(row => {
            console.log(`  - ${row.role}: ${row.count} utilisateur(s)`);
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la mise à jour de la contrainte:', error);
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
}

// Exécuter le script
updateUsersRoleConstraint()
    .then(() => {
        console.log('✅ Script terminé avec succès');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script échoué:', error);
        process.exit(1);
    });
