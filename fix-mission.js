const { pool } = require('./src/utils/database');

async function fixMission() {
    try {
        console.log('🔧 Correction de la mission...');
        
        const result = await pool.query(
            'UPDATE missions SET collaborateur_id = $1, associe_id = $2 WHERE nom = $3',
            [
                '603f85e4-e81a-4af8-a17f-cc6533eab932',
                '61f2111c-ff28-48b5-b01a-e07eb32119f0', 
                'Conseil Stratégique Client Test 2'
            ]
        );
        
        console.log('✅ Mission corrigée:', result.rowCount, 'lignes modifiées');
        
        // Vérifier
        const check = await pool.query(
            'SELECT nom, collaborateur_id, associe_id FROM missions WHERE nom = $1',
            ['Conseil Stratégique Client Test 2']
        );
        
        console.log('📋 Vérification:', check.rows[0]);
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

fixMission(); 