const { pool } = require('./src/utils/database');

async function checkUsersCount() {
    try {
        console.log('🔍 Vérification du nombre d\'utilisateurs...\n');
        
        // 1. Compter tous les utilisateurs
        const countResult = await pool.query(`
            SELECT COUNT(*) as total
            FROM users
        `);
        
        console.log(`📊 Total utilisateurs: ${countResult.rows[0].total}`);
        
        // 2. Afficher les 10 derniers utilisateurs
        const users = await pool.query(`
            SELECT id, nom, prenom, email, login, role, created_at
            FROM users 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        
        console.log('\n📋 10 derniers utilisateurs:');
        users.rows.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.prenom} ${user.nom} (${user.email})`);
            console.log(`     - Login: ${user.login}`);
            console.log(`     - Role: ${user.role}`);
            console.log(`     - Créé le: ${user.created_at}`);
            console.log('');
        });
        
        // 3. Vérifier les collaborateurs avec compte utilisateur
        const collabWithUser = await pool.query(`
            SELECT COUNT(*) as total
            FROM collaborateurs 
            WHERE user_id IS NOT NULL
        `);
        
        console.log(`📊 Collaborateurs avec compte utilisateur: ${collabWithUser.rows[0].total}`);
        
        // 4. Vérifier les collaborateurs sans compte utilisateur
        const collabWithoutUser = await pool.query(`
            SELECT COUNT(*) as total
            FROM collaborateurs 
            WHERE user_id IS NULL
        `);
        
        console.log(`📊 Collaborateurs sans compte utilisateur: ${collabWithoutUser.rows[0].total}`);
        
        await pool.end();
        
        console.log('\n✅ Vérification terminée !');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

checkUsersCount(); 