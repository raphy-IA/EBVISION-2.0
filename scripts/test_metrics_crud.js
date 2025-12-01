const { query } = require('../src/utils/database');

async function testMetricsCRUD() {
    console.log('🧪 Test CRUD des Métriques de Performance\n');

    try {
        // 1. Récupérer les unités disponibles
        console.log('📊 1. Récupération des unités...');
        const unitsResult = await query('SELECT * FROM objective_units WHERE is_active = TRUE');
        console.log(`   ✅ ${unitsResult.rows.length} unités trouvées`);
        unitsResult.rows.forEach(u => console.log(`      - ${u.code}: ${u.label} (${u.symbol})`));

        if (unitsResult.rows.length === 0) {
            console.log('   ❌ Aucune unité trouvée. Impossible de continuer.');
            return;
        }

        const eurUnit = unitsResult.rows.find(u => u.code === 'EUR');
        if (!eurUnit) {
            console.log('   ❌ Unité EUR non trouvée. Impossible de continuer.');
            return;
        }

        // 2. Récupérer les types d'objectifs avec unité EUR
        console.log('\n📊 2. Récupération des types d\'objectifs (EUR)...');
        const typesResult = await query(`
            SELECT ot.*, ou.code as unit_code, ou.symbol as unit_symbol
            FROM objective_types ot
            LEFT JOIN objective_units ou ON ot.unit_id = ou.id
            WHERE ou.code = 'EUR' AND ot.is_active = TRUE
            LIMIT 5
        `);
        console.log(`   ✅ ${typesResult.rows.length} types trouvés`);
        typesResult.rows.forEach(t => console.log(`      - ${t.code}: ${t.label}`));

        if (typesResult.rows.length < 2) {
            console.log('   ❌ Pas assez de types d\'objectifs. Impossible de continuer.');
            return;
        }

        // 3. Créer une métrique de test
        console.log('\n📊 3. Création d\'une métrique de test...');
        const metricCode = `TEST_METRIC_${Date.now()}`;
        const createResult = await query(`
            INSERT INTO objective_metrics (code, label, description, calculation_type, target_unit_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [
            metricCode,
            'CA Total Test',
            'Métrique de test pour vérifier le système',
            'SUM',
            eurUnit.id
        ]);
        const metric = createResult.rows[0];
        console.log(`   ✅ Métrique créée: ${metric.id}`);

        // 4. Ajouter des sources
        console.log('\n📊 4. Ajout de sources à la métrique...');
        for (let i = 0; i < Math.min(2, typesResult.rows.length); i++) {
            const type = typesResult.rows[i];
            await query(`
                INSERT INTO objective_metric_sources (metric_id, objective_type_id, unit_id, weight)
                VALUES ($1, $2, $3, $4)
            `, [metric.id, type.id, eurUnit.id, 1.0]);
            console.log(`   ✅ Source ajoutée: ${type.label}`);
        }

        // 5. Récupérer la métrique avec ses sources (comme le ferait l'API)
        console.log('\n📊 5. Récupération de la métrique via l\'API...');
        const getResult = await query(`
            SELECT 
                m.id,
                m.code,
                m.label,
                m.description,
                m.calculation_type,
                m.target_unit_id,
                u.code as unit_code,
                u.label as unit_label,
                u.symbol as unit_symbol,
                m.is_active,
                (
                    SELECT json_agg(json_build_object(
                        'id', s.id,
                        'objective_type_id', s.objective_type_id,
                        'value_field', s.data_source_value_column
                    ))
                    FROM objective_metric_sources s
                    WHERE s.metric_id = m.id
                ) as sources
            FROM objective_metrics m
            LEFT JOIN objective_units u ON m.target_unit_id = u.id
            WHERE m.id = $1
        `, [metric.id]);

        const retrievedMetric = getResult.rows[0];
        console.log('   ✅ Métrique récupérée:');
        console.log(`      - ID: ${retrievedMetric.id}`);
        console.log(`      - Code: ${retrievedMetric.code}`);
        console.log(`      - Label: ${retrievedMetric.label}`);
        console.log(`      - Unit Code: ${retrievedMetric.unit_code}`);
        console.log(`      - Sources: ${retrievedMetric.sources ? retrievedMetric.sources.length : 0}`);

        if (retrievedMetric.sources) {
            retrievedMetric.sources.forEach((s, idx) => {
                console.log(`        ${idx + 1}. Type ID: ${s.objective_type_id}`);
            });
        }

        // 6. Vérifier les champs nécessaires pour le frontend
        console.log('\n📊 6. Vérification des champs pour le frontend...');
        const requiredFields = ['id', 'code', 'label', 'description', 'unit_code', 'sources'];
        const missingFields = requiredFields.filter(field => !(field in retrievedMetric));

        if (missingFields.length > 0) {
            console.log(`   ❌ Champs manquants: ${missingFields.join(', ')}`);
        } else {
            console.log('   ✅ Tous les champs requis sont présents');
        }

        // 7. Modifier la métrique
        console.log('\n📊 7. Modification de la métrique...');
        await query(`
            UPDATE objective_metrics
            SET label = $1, description = $2
            WHERE id = $3
        `, ['CA Total Test (modifié)', 'Description mise à jour', metric.id]);
        console.log('   ✅ Métrique modifiée');

        // 8. Nettoyage
        console.log('\n📊 8. Nettoyage...');
        await query('DELETE FROM objective_metric_sources WHERE metric_id = $1', [metric.id]);
        await query('DELETE FROM objective_metrics WHERE id = $1', [metric.id]);
        console.log('   ✅ Données de test supprimées');

        console.log('\n✅ Test terminé avec succès !');

    } catch (error) {
        console.error('❌ Erreur:', error);
        process.exit(1);
    }

    process.exit(0);
}

testMetricsCRUD();
