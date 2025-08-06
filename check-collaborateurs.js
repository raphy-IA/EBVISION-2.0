const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

async function checkCollaborateurs() {
    try {
        console.log('🔍 Vérification des collaborateurs...');
        
        // Récupérer les collaborateurs avec leurs utilisateurs associés
        const collaborateurs = await pool.query(`
            SELECT 
                c.id as collaborateur_id,
                c.nom,
                c.prenom,
                c.email,
                c.user_id,
                u.id as user_id,
                u.email as user_email,
                u.role as user_role
            FROM collaborateurs c
            LEFT JOIN users u ON c.user_id = u.id
            LIMIT 5
        `);
        
        console.log('\n📋 Collaborateurs trouvés:');
        collaborateurs.rows.forEach(collab => {
            console.log(`  - ${collab.collaborateur_id}: ${collab.nom} ${collab.prenom} (${collab.email})`);
            if (collab.user_id) {
                console.log(`    → Utilisateur: ${collab.user_id} (${collab.user_email}) - ${collab.user_role}`);
            } else {
                console.log(`    → Aucun utilisateur associé`);
            }
        });
        
        // Trouver un collaborateur avec un utilisateur associé
        const collaborateurWithUser = collaborateurs.rows.find(c => c.user_id);
        
        if (collaborateurWithUser) {
            console.log('\n✅ Collaborateur avec utilisateur trouvé:', {
                collaborateur_id: collaborateurWithUser.collaborateur_id,
                nom: collaborateurWithUser.nom,
                prenom: collaborateurWithUser.prenom,
                user_id: collaborateurWithUser.user_id,
                user_email: collaborateurWithUser.user_email
            });
        } else {
            console.log('\n❌ Aucun collaborateur avec utilisateur associé trouvé');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkCollaborateurs(); 