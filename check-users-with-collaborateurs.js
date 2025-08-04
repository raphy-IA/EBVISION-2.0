const { pool } = require('./src/utils/database');

async function checkUsersWithCollaborateurs() {
    try {
        console.log('🔍 Vérification des utilisateurs et leurs liens avec les collaborateurs...\n');
        
        // 1. Récupérer tous les utilisateurs avec leurs liens collaborateurs
        const usersResult = await pool.query(`
            SELECT 
                u.id,
                u.nom,
                u.prenom,
                u.email,
                u.login,
                u.role,
                u.statut,
                c.id as collaborateur_id,
                c.nom as collaborateur_nom,
                c.prenom as collaborateur_prenom
            FROM users u
            LEFT JOIN collaborateurs c ON u.id = c.user_id
            ORDER BY u.created_at DESC
        `);
        
        console.log(`📊 Total d'utilisateurs: ${usersResult.rows.length}`);
        console.log('\n📋 Détail des utilisateurs:');
        
        let linkedCount = 0;
        let freeCount = 0;
        
        usersResult.rows.forEach((user, index) => {
            const isLinked = user.collaborateur_id !== null;
            if (isLinked) linkedCount++;
            else freeCount++;
            
            console.log(`${index + 1}. ${user.prenom} ${user.nom}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Login: ${user.login || 'Non défini'}`);
            console.log(`   Rôle: ${user.role}`);
            console.log(`   Statut: ${user.statut}`);
            console.log(`   Type: ${isLinked ? '🔗 Lié à collaborateur' : '🆓 Libre'}`);
            if (isLinked) {
                console.log(`   Collaborateur: ${user.collaborateur_prenom} ${user.collaborateur_nom}`);
            }
            console.log('');
        });
        
        console.log(`📈 Statistiques:`);
        console.log(`   - Utilisateurs liés: ${linkedCount}`);
        console.log(`   - Utilisateurs libres: ${freeCount}`);
        console.log(`   - Total: ${usersResult.rows.length}`);
        
        // 2. Vérifier les collaborateurs sans utilisateur
        const collaboratorsResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM collaborateurs 
            WHERE user_id IS NULL
        `);
        
        console.log(`\n⚠️ Collaborateurs sans compte utilisateur: ${collaboratorsResult.rows[0].count}`);
        
        console.log('\n✅ Vérification terminée !');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkUsersWithCollaborateurs(); 