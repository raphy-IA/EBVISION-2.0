const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'eb_vision_2_0',
    password: 'password',
    port: 5432,
});

async function checkMissions() {
    try {
        console.log('🔍 Vérification des missions disponibles');
        
        const result = await pool.query(`
            SELECT id, nom, description 
            FROM missions 
            LIMIT 10
        `);
        
        console.log('📊 Missions trouvées:', result.rows.length);
        result.rows.forEach(mission => {
            console.log(`  - ID: ${mission.id}, Nom: ${mission.nom}`);
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

checkMissions(); 