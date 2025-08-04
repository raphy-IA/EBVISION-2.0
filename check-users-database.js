const { pool } = require('./src/utils/database');

async function checkUsersDatabase() {
    try {
        console.log('🔍 Vérification des utilisateurs dans la base de données...\n');
        
        // 1. Compter le nombre total d'utilisateurs
        const countResult = await pool.query('SELECT COUNT(*) as total FROM users');
        console.log(`📊 Total d'utilisateurs: ${countResult.rows[0].total}`);
        
        // 2. Lister les 10 premiers utilisateurs avec leurs informations de connexion
        const usersResult = await pool.query(`
            SELECT id, nom, prenom, email, login, role, statut, created_at
            FROM users 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        
        console.log('\n📋 10 derniers utilisateurs:');
        usersResult.rows.forEach((user, index) => {
            console.log(`${index + 1}. ${user.prenom} ${user.nom}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Login: ${user.login || 'Non défini'}`);
            console.log(`   Rôle: ${user.role}`);
            console.log(`   Statut: ${user.statut}`);
            console.log(`   ID: ${user.id}`);
            console.log('');
        });
        
        // 3. Vérifier s'il y a des utilisateurs avec des mots de passe
        const passwordResult = await pool.query(`
            SELECT COUNT(*) as count 
            FROM users 
            WHERE password_hash IS NOT NULL AND password_hash != ''
        `);
        console.log(`🔐 Utilisateurs avec mot de passe: ${passwordResult.rows[0].count}`);
        
        // 4. Lister les utilisateurs sans mot de passe
        const noPasswordResult = await pool.query(`
            SELECT id, nom, prenom, email, login
            FROM users 
            WHERE password_hash IS NULL OR password_hash = ''
            LIMIT 5
        `);
        
        if (noPasswordResult.rows.length > 0) {
            console.log('\n⚠️ Utilisateurs sans mot de passe:');
            noPasswordResult.rows.forEach(user => {
                console.log(`   - ${user.prenom} ${user.nom} (${user.email})`);
            });
        }
        
        console.log('\n✅ Vérification terminée !');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkUsersDatabase(); 