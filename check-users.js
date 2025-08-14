require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'eb_vision_db',
    password: 'postgres',
    port: 5432,
});

async function checkUsers() {
    try {
        console.log('🔍 Vérification des utilisateurs dans la base de données...');
        
        const query = `
            SELECT id, email, nom, prenom, role, created_at
            FROM users
            ORDER BY created_at DESC
        `;
        
        const result = await pool.query(query);
        
        console.log(`✅ ${result.rows.length} utilisateur(s) trouvé(s):`);
        result.rows.forEach((user, index) => {
            console.log(`${index + 1}. ID: ${user.id}, Email: ${user.email}, Nom: ${user.nom} ${user.prenom}, Role: ${user.role}`);
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkUsers(); 