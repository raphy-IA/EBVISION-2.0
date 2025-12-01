const { query } = require('../src/utils/database');

async function testMetricsE2E() {
    console.log('🧪 Test End-to-End des Métriques\n');

    try {
        // 1. Charger les types d'objectifs de type CURRENCY
        console.log('📊 1. Chargement des types d'objectifs(CURRENCY)...');
        const typesResult = await query(`
            SELECT ot.id, ot.code, ot.label, ou.code as unit_code
            FROM objective_types ot
            JOIN objective_units ou ON ot.unit_id = ou.id
            WHERE ou.code = 'CURRENCY' AND ot.is_active = TRUE
            LIMIT 3
        `);
        console.log(`   ✅ ${typesResult.rows.length} types trouvés`);
        typesResult.rows.forEach(t => console.log(`      - ${t.label} (${t.unit_code})`));

        if (typesResult.rows.length < 2) {
            console.log('   ❌ Pas assez de types. Test arrêté.');
            process.exit(1);
        }

        // 2. Récupérer l'ID de l'unité CURRENCY
        const unitResult = await query(`SELECT id, code FROM objective_units WHERE code = 'CURRENCY'`);
        const currencyUnit = unitResult.rows[0];
        console.log(`\n📊 2. Unité CURRENCY trouvée: ${currencyUnit.id}`);

        // 3. Créer une métrique via l'API (simulation)
        console.log('\n📊 3. Création d'une métrique de test...');
        const metricCode = `METRIC_TEST_${Date.now()}`;
        const createMetricResult = await query(`
            INSERT INTO objective_metrics (code, label, description, calculation_type, target_unit_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [
            metricCode,
            'CA Total Test E2E',
            'Métrique de test pour validation end-to-end',
            'SUM',
            currencyUnit.id
        ]);
        const metric = createMetricResult.rows[0];
        console.log(`   ✅ Métrique créée: ID= ${metric.id}, Code=${metric.code}`);

        // 4. Ajouter des sources basées sur objective_type_id
        console.log('\n📊 4. Ajout de sources à la métrique...');
        for (const type of typesResult.rows) {
            await query(`
                INSERT INTO objective_metric_sources (metric_id, objective_type_id, unit_id, weight)
                VALUES ($1, $2, $3, $4)
            `, [metric.id, type.id, currencyUnit.id, 1.0]);
            console.log(`   ✅ Source ajoutée: ${type.label}`);
        }

        // 5. Récupérer la métrique comme le ferait le frontend
        console.log('\n📊 5. Récupération de la métrique (comme l'API)...');
        const getMetricResult = await query(`
            SELECT 
                m.id, m.code, m.label, m.description,
                m.target_unit_id,
                u.code as unit_code,
                u.label  as unit_label,
                u.symbol as unit_symbol,
                (
                    SELECT json_agg(json_build_object(
                        'id', s.id,
                        'objective_type_id', s.objective_type_id,
                        'opportunity_type', s.filter_conditions->>'opportunity_type_id',
                        'value_field', s.data_source_value_column
                    ))
                    FROM objective_metric_sources s
                    WHERE s.metric_id = m.id
                ) as sources
            FROM objective_metrics m
            LEFT JOIN objective_units u ON m.target_unit_id = u.id
            WHERE m.id = $1
        `, [metric.id]);

        const retrievedMetric = getMetricResult.rows[0];
        console.log('   ✅ Métrique récupérée:');
        console.log(`      - ID: ${retrievedMetric.id}`);
        console.log(`      - Code: ${retrievedMetric.code}`);
        console.log(`      - Label: ${retrievedMetric.label}`);
        console.log(`      - Unit Code: ${retrievedMetric.unit_code}`);
        console.log(`      - Sources (${retrievedMetric.sources.length}):`);
        retrievedMetric.sources.forEach((s, idx) => {
            console.log(`        ${idx + 1}. ObjectiveType ID: ${s.objective_type_id}`);
        });

        // 6. Vérifier que tous les champs nécessaires sont présents
        console.log('\n📊 6. Validation des champs frontend...');
        const requiredFields = ['id', 'code', 'label', 'description', 'unit_code', 'sources'];
        const missing = requiredFields.filter(f => !(f in retrievedMetric));

        if (missing.length > 0) {
            console.log(`   ❌ Champs manquants: ${missing.join(', ')}`);
            process.exit(1);
        }

        console.log('   ✅ Tous les champs requis sont présents');

        // 7. Nettoyage
        console.log('\n📊 7. Nettoyage...');
        await query('DELETE FROM objective_metric_sources WHERE metric_id = $1', [metric.id]);
        await query('DELETE FROM objective_metrics WHERE id = $1', [metric.id]);
        console.log('   ✅ Données de test supprimées');

        console.log('\n✅✅✅ TEST END-TO-END RÉUSSI !');
        console.log('\n📝 Résumé:');
        console.log('   - Création de métrique: OK');
        console.log('   - Ajout de sources par objective_type_id: OK');
        console.log('   - Récupération avec unit_code: OK');
        console.log('   - Validation des champs frontend: OK');

    } catch (error) {
        console.error('\n❌ ERREUR:', error);
        process.exit(1);
    }

    process.exit(0);
}

testMetricsE2E();
