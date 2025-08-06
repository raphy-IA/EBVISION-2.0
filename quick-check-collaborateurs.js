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
        
        const result = await pool.query('SELECT id, nom, prenom, email FROM collaborateurs LIMIT 3');
        console.log('Collaborateurs trouvés:', result.rows);
        
        if (result.rows.length > 0) {
            const firstCollaborateur = result.rows[0];
            console.log('\n✅ Premier collaborateur:', firstCollaborateur);
            
            // Utiliser cet ID pour le middleware d'authentification
            console.log('\n📝 ID à utiliser dans le middleware:', firstCollaborateur.id);
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkCollaborateurs(); 