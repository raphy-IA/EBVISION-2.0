const { pool } = require('./src/utils/database');

async function checkSpecificMission() {
    try {
        console.log('🔍 Vérification de la mission spécifique...');
        
        const missionId = 'f1b5a971-3a94-473d-af5b-7922348d8a1d';
        
        // Vérifier les données de base
        const missionResult = await pool.query(
            'SELECT * FROM missions WHERE id = $1',
            [missionId]
        );
        
        console.log('📋 Mission trouvée:', JSON.stringify(missionResult.rows[0], null, 2));
        
        if (missionResult.rows.length === 0) {
            console.log('❌ Mission non trouvée');
            return;
        }
        
        const mission = missionResult.rows[0];
        
        // Vérifier les collaborateurs assignés
        const collaborateurResult = await pool.query(
            'SELECT c.* FROM collaborateurs c WHERE c.id IN ($1, $2)',
            [mission.collaborateur_id, mission.associe_id]
        );
        
        console.log('👥 Collaborateurs assignés:', JSON.stringify(collaborateurResult.rows, null, 2));
        
        // Vérifier avec la requête complète
        const fullQueryResult = await pool.query(`
            SELECT 
                m.*,
                c.nom as client_nom,
                c.statut as client_statut,
                col_resp.nom as responsable_nom,
                col_resp.prenom as responsable_prenom,
                col_resp.initiales as responsable_initiales,
                d.nom as division_nom,
                bu.nom as business_unit_nom,
                col_assoc.nom as associe_nom,
                col_assoc.prenom as associe_prenom,
                col_assoc.initiales as associe_initiales
            FROM missions m
            LEFT JOIN clients c ON m.client_id = c.id
            LEFT JOIN collaborateurs col_resp ON m.collaborateur_id = col_resp.id
            LEFT JOIN divisions d ON m.division_id = d.id
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            LEFT JOIN collaborateurs col_assoc ON m.associe_id = col_assoc.id
            WHERE m.id = $1
        `, [missionId]);
        
        console.log('🔍 Résultat de la requête complète:', JSON.stringify(fullQueryResult.rows[0], null, 2));
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkSpecificMission(); 