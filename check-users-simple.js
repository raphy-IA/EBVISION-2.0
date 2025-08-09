const pool = require('./src/utils/database').pool;

async function checkUsers() {
    try {
        console.log('🔍 Vérification des utilisateurs dans la base de données...');
        
        const result = await pool.query(`
            SELECT 
                u.id,
                u.email,
                u.nom,
                u.prenom,
                u.role,
                c.nom as collaborateur_nom,
                c.prenom as collaborateur_prenom
            FROM users u
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            ORDER BY u.email
        `);
        
        console.log(`✅ ${result.rows.length} utilisateurs trouvés:`);
        result.rows.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.email} (${user.nom} ${user.prenom}) - Role: ${user.role}`);
            if (user.collaborateur_nom) {
                console.log(`       Collaborateur: ${user.collaborateur_nom} ${user.collaborateur_prenom}`);
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkUsers();
