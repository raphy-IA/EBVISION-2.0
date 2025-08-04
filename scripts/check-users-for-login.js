const { pool } = require('../src/utils/database');

async function checkUsersForLogin() {
    try {
        console.log('🔍 Vérification des utilisateurs disponibles pour la connexion...');
        
        const result = await pool.query(`
            SELECT id, nom, prenom, email, login, role, statut 
            FROM users 
            WHERE statut = 'ACTIF' 
            ORDER BY nom, prenom
        `);
        
        if (result.rows.length === 0) {
            console.log('❌ Aucun utilisateur actif trouvé dans la base de données');
            console.log('💡 Vous devez créer un utilisateur pour pouvoir vous connecter');
        } else {
            console.log(`✅ ${result.rows.length} utilisateur(s) actif(s) trouvé(s):`);
            console.log('');
            
            result.rows.forEach((user, index) => {
                console.log(`${index + 1}. ${user.nom} ${user.prenom}`);
                console.log(`   📧 Email: ${user.email}`);
                console.log(`   🔑 Login: ${user.login}`);
                console.log(`   👤 Rôle: ${user.role}`);
                console.log(`   📊 Statut: ${user.statut}`);
                console.log('');
            });
            
            console.log('💡 Utilisez l\'un de ces identifiants pour vous connecter');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error.message);
    } finally {
        await pool.end();
    }
}

checkUsersForLogin(); 