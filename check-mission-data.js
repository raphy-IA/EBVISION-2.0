const { pool } = require('./src/utils/database');

async function checkMissionData() {
    try {
        console.log('🔍 Vérification des données de la mission...');
        
        // 1. Vérifier la mission par nom
        const missionResult = await pool.query(
            'SELECT * FROM missions WHERE nom = $1',
            ['Conseil Stratégique Client Test 2']
        );
        
        console.log('📋 Mission trouvée:', JSON.stringify(missionResult.rows[0], null, 2));
        
        if (missionResult.rows.length === 0) {
            console.log('❌ Mission non trouvée');
            return;
        }
        
        const mission = missionResult.rows[0];
        
        // 2. Vérifier les collaborateurs assignés
        const collaborateurResult = await pool.query(
            'SELECT c.* FROM collaborateurs c WHERE c.id IN ($1, $2)',
            [mission.collaborateur_id, mission.associe_id]
        );
        
        console.log('👥 Collaborateurs assignés:', JSON.stringify(collaborateurResult.rows, null, 2));
        
        // 3. Vérifier avec la requête complète (comme dans le modèle)
        const fullQueryResult = await pool.query(`
            SELECT 
                m.*,
                c.nom as client_nom,
                c.statut as client_statut,
                col_resp.nom as responsable_nom,
                col_resp.initiales as responsable_initiales,
                d.nom as division_nom,
                bu.nom as business_unit_nom,
                col_assoc.nom as associe_nom,
                col_assoc.initiales as associe_initiales
            FROM missions m
            LEFT JOIN clients c ON m.client_id = c.id
            LEFT JOIN collaborateurs col_resp ON m.collaborateur_id = col_resp.id
            LEFT JOIN divisions d ON m.division_id = d.id
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            LEFT JOIN collaborateurs col_assoc ON m.associe_id = col_assoc.id
            WHERE m.id = $1
        `, [mission.id]);
        
        console.log('🔍 Résultat de la requête complète:', JSON.stringify(fullQueryResult.rows[0], null, 2));
        
        // 4. Vérifier les IDs spécifiques
        console.log('🔑 IDs de la mission:');
        console.log('  - Mission ID:', mission.id);
        console.log('  - Collaborateur ID (responsable):', mission.collaborateur_id);
        console.log('  - Associé ID:', mission.associe_id);
        console.log('  - Client ID:', mission.client_id);
        console.log('  - Division ID:', mission.division_id);
        console.log('  - Business Unit ID:', mission.business_unit_id);
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkMissionData(); 