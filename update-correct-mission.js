const { pool } = require('./src/utils/database');

async function updateCorrectMission() {
    try {
        console.log('🔍 Mise à jour de la mission "Conseil Stratégique Client Test 2"...');
        
        // 1. Trouver la mission par nom
        const missionResult = await pool.query(
            'SELECT id FROM missions WHERE nom = $1',
            ['Conseil Stratégique Client Test 2']
        );
        
        if (missionResult.rows.length === 0) {
            console.log('❌ Mission non trouvée');
            return;
        }
        
        const missionId = missionResult.rows[0].id;
        console.log('📋 Mission ID trouvé:', missionId);
        
        // 2. Trouver des collaborateurs disponibles
        const collaborateursResult = await pool.query(
            'SELECT id, nom, prenom FROM collaborateurs LIMIT 3'
        );
        
        console.log('👥 Collaborateurs disponibles:', collaborateursResult.rows);
        
        if (collaborateursResult.rows.length < 2) {
            console.log('❌ Pas assez de collaborateurs disponibles');
            return;
        }
        
        const responsableId = collaborateursResult.rows[0].id;
        const associeId = collaborateursResult.rows[1].id;
        
        // 3. Trouver une division et business unit
        const divisionResult = await pool.query(
            'SELECT id, nom FROM divisions LIMIT 1'
        );
        
        const businessUnitResult = await pool.query(
            'SELECT id, nom FROM business_units LIMIT 1'
        );
        
        // 4. Mettre à jour la mission
        const updateResult = await pool.query(
            `UPDATE missions SET 
                collaborateur_id = $1, 
                associe_id = $2, 
                division_id = $3, 
                business_unit_id = $4 
             WHERE id = $5`,
            [
                responsableId,
                associeId,
                divisionResult.rows.length > 0 ? divisionResult.rows[0].id : null,
                businessUnitResult.rows.length > 0 ? businessUnitResult.rows[0].id : null,
                missionId
            ]
        );
        
        console.log('✅ Mission mise à jour:', updateResult.rowCount, 'lignes modifiées');
        
        // 5. Vérifier la mise à jour
        const checkResult = await pool.query(`
            SELECT 
                m.nom,
                c1.nom as responsable_nom, c1.prenom as responsable_prenom,
                c2.nom as associe_nom, c2.prenom as associe_prenom,
                d.nom as division_nom,
                bu.nom as business_unit_nom
            FROM missions m
            LEFT JOIN collaborateurs c1 ON m.collaborateur_id = c1.id
            LEFT JOIN collaborateurs c2 ON m.associe_id = c2.id
            LEFT JOIN divisions d ON m.division_id = d.id
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            WHERE m.id = $1
        `, [missionId]);
        
        console.log('📋 Données de la mission après mise à jour:', JSON.stringify(checkResult.rows[0], null, 2));
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

updateCorrectMission(); 