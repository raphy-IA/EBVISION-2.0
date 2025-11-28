const { pool } = require('../src/utils/database');
const Objective = require('../src/models/Objective');
const ObjectiveTrackingService = require('../services/ObjectiveTrackingService');

async function verifyTracking() {
    try {
        console.log('🧪 Vérification du système de suivi automatique...');

        // Récupérer les IDs nécessaires
        const fyResult = await pool.query('SELECT id FROM fiscal_years LIMIT 1');
        const userResult = await pool.query('SELECT id FROM users LIMIT 1');

        if (!fyResult.rows[0] || !userResult.rows[0]) {
            throw new Error('Données manquantes (FY ou User) dans la BD');
        }

        const fiscalYearId = fyResult.rows[0].id;
        const userId = userResult.rows[0].id;

        // Trouver un type d'objectif non utilisé
        const typesResult = await pool.query('SELECT id FROM objective_types');
        const existingObjsResult = await pool.query(
            'SELECT objective_type_id FROM global_objectives WHERE fiscal_year_id = $1',
            [fiscalYearId]
        );
        const existingTypeIds = new Set(existingObjsResult.rows.map(r => r.objective_type_id));

        const unusedType = typesResult.rows.find(t => !existingTypeIds.has(t.id));

        if (!unusedType) {
            console.log('⚠️ Tous les types sont utilisés. Test annulé pour éviter les conflits.');
            console.log('✅ Structure de la base de données vérifiée.');
            return;
        }

        const objectiveTypeId = unusedType.id;
        console.log(`Utilisation: FY=${fiscalYearId}, Type=${objectiveTypeId}`);

        // Créer un objectif de test avec suivi automatique
        console.log('Création d\'un objectif test...');
        const objective = await Objective.createGlobalObjective({
            fiscal_year_id: fiscalYearId,
            objective_type_id: objectiveTypeId,
            target_value: 10,
            description: 'Test Suivi Automatique',
            created_by: userId,
            tracking_type: 'AUTOMATIC',
            metric_code: 'CAMPAIGNS_COUNT'
        });
        console.log('✅ Objectif créé:', objective.id);

        // Exécuter le service de suivi
        console.log('Exécution du service de suivi...');
        const result = await ObjectiveTrackingService.updateProgress('CAMPAIGNS_COUNT', userId);
        console.log('✅ Résultat:', result);

        // Vérifier la mise à jour
        const globalObjs = await Objective.getGlobalObjectives(fiscalYearId);
        const updatedObj = globalObjs.find(o => o.id === objective.id);

        if (updatedObj) {
            console.log(`✅ Progression: ${updatedObj.current_value} / ${updatedObj.target_value}`);
        } else {
            console.error('❌ Objectif non trouvé après mise à jour');
        }

        // Nettoyage
        await Objective.deleteGlobalObjective(objective.id);
        console.log('🧹 Nettoyage terminé');

    } catch (error) {
        console.error('❌ Vérification échouée:', error.message);
    } finally {
        await pool.end();
    }
}

verifyTracking();
