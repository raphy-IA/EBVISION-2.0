const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'eb_vision_2_0',
    user: 'postgres',
    password: 'postgres'
});

async function cleanTimeSheets() {
    const client = await pool.connect();
    try {
        console.log('🧹 Nettoyage des time sheets existants...');
        
        // Supprimer tous les time sheets pour l'utilisateur de test
        const userId = 'f6a6567f-b51d-4dbc-872d-1005156bd187';
        
        // Récupérer le collaborateur
        const collaborateurResult = await client.query(
            'SELECT id FROM collaborateurs WHERE user_id = $1',
            [userId]
        );
        
        if (collaborateurResult.rows.length === 0) {
            console.log('❌ Aucun collaborateur trouvé');
            return;
        }
        
        const collaborateurId = collaborateurResult.rows[0].id;
        console.log('✅ Collaborateur trouvé:', collaborateurId);
        
        // Supprimer les time sheets existants
        const deleteResult = await client.query(
            'DELETE FROM time_sheets WHERE collaborateur_id = $1',
            [collaborateurId]
        );
        
        console.log(`✅ ${deleteResult.rowCount} time sheets supprimés`);
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanTimeSheets(); 