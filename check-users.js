require('dotenv').config();
const { pool } = require('./src/utils/database');

async function checkUsers() {
    console.log('👥 Vérification des utilisateurs disponibles...\n');
    
    try {
        const query = `
            SELECT 
                u.id,
                u.email,
                u.role,
                c.nom,
                c.prenom,
                c.email as collaborateur_email
            FROM users u
            LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
            ORDER BY u.email
        `;
        
        const result = await pool.query(query);
        
        console.log(`✅ ${result.rows.length} utilisateurs trouvés:\n`);
        
        result.rows.forEach((user, index) => {
            console.log(`${index + 1}. ${user.email} (${user.role})`);
            if (user.nom && user.prenom) {
                console.log(`   Collaborateur: ${user.prenom} ${user.nom}`);
            }
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkUsers().catch(console.error); 