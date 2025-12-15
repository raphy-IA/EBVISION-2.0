const { pool } = require('../../src/utils/database');

/**
 * Script d'analyse des types de mission avant migration
 * Identifie les types partagés entre plusieurs Business Units
 */

async function analyzeMissionTypes() {
    try {
        console.log('🔍 Analyse des types de mission...\n');

        // 1. Analyser les types utilisés par plusieurs BU
        const sharedTypesQuery = `
            SELECT 
                mt.id,
                mt.codification,
                mt.libelle,
                mt.division_id,
                d.nom as division_nom,
                d.business_unit_id as division_bu_id,
                COUNT(DISTINCT m.business_unit_id) as bu_count,
                ARRAY_AGG(DISTINCT m.business_unit_id) as business_unit_ids,
                ARRAY_AGG(DISTINCT bu.nom) as business_unit_names,
                COUNT(m.id) as mission_count
            FROM mission_types mt
            LEFT JOIN divisions d ON mt.division_id = d.id
            LEFT JOIN missions m ON m.mission_type_id = mt.id
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            WHERE m.id IS NOT NULL
            GROUP BY mt.id, mt.codification, mt.libelle, mt.division_id, d.nom, d.business_unit_id
            ORDER BY bu_count DESC, mt.codification;
        `;

        const result = await pool.query(sharedTypesQuery);

        console.log(`📊 Total des types de mission analysés: ${result.rows.length}\n`);

        // Séparer les types selon leur utilisation
        const sharedTypes = result.rows.filter(row => row.bu_count > 1);
        const singleBuTypes = result.rows.filter(row => row.bu_count === 1);
        const typesWithDivision = result.rows.filter(row => row.division_id !== null);
        const typesWithoutDivision = result.rows.filter(row => row.division_id === null);

        console.log('📈 Statistiques:\n');
        console.log(`   ✅ Types utilisés par une seule BU: ${singleBuTypes.length}`);
        console.log(`   ⚠️  Types partagés entre plusieurs BU: ${sharedTypes.length}`);
        console.log(`   📁 Types avec division: ${typesWithDivision.length}`);
        console.log(`   📂 Types sans division: ${typesWithoutDivision.length}\n`);

        if (sharedTypes.length > 0) {
            console.log('⚠️  TYPES PARTAGÉS À DUPLIQUER:\n');
            sharedTypes.forEach(type => {
                console.log(`   🔸 ${type.codification} - ${type.libelle}`);
                console.log(`      Utilisé par ${type.bu_count} BU: ${type.business_unit_names.join(', ')}`);
                console.log(`      ${type.mission_count} missions au total`);
                console.log(`      Division: ${type.division_nom || 'Aucune'}\n`);
            });
        }

        // 2. Vérifier les types sans missions
        const unusedTypesQuery = `
            SELECT mt.id, mt.codification, mt.libelle
            FROM mission_types mt
            LEFT JOIN missions m ON m.mission_type_id = mt.id
            WHERE m.id IS NULL;
        `;

        const unusedResult = await pool.query(unusedTypesQuery);

        if (unusedResult.rows.length > 0) {
            console.log(`\n📭 Types de mission non utilisés: ${unusedResult.rows.length}`);
            unusedResult.rows.forEach(type => {
                console.log(`   - ${type.codification} - ${type.libelle}`);
            });
            console.log('\n   ℹ️  Ces types devront avoir une BU assignée manuellement\n');
        }

        // 3. Résumé de la migration
        console.log('\n📋 RÉSUMÉ DE LA MIGRATION:\n');
        console.log(`   1. Types à dupliquer: ${sharedTypes.length}`);
        console.log(`   2. Nouveaux types à créer: ${sharedTypes.reduce((sum, t) => sum + (t.bu_count - 1), 0)}`);
        console.log(`   3. Types avec division (BU auto): ${typesWithDivision.length}`);
        console.log(`   4. Types sans division ni mission: ${unusedResult.rows.length}`);
        console.log(`   5. Missions à mettre à jour: ${result.rows.reduce((sum, t) => sum + parseInt(t.mission_count), 0)}\n`);

        return {
            sharedTypes,
            singleBuTypes,
            typesWithDivision,
            typesWithoutDivision,
            unusedTypes: unusedResult.rows
        };

    } catch (error) {
        console.error('❌ Erreur lors de l\'analyse:', error);
        throw error;
    }
}

// Exécution
if (require.main === module) {
    analyzeMissionTypes()
        .then(() => {
            console.log('✅ Analyse terminée');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Erreur:', error);
            process.exit(1);
        });
}

module.exports = { analyzeMissionTypes };
