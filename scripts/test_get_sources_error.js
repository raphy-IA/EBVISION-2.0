const { query } = require('../src/utils/database');

async function testGetSources() {
    console.log('🔍 Test de getSources pour identifier l\'erreur UUID = integer\n');

    const metricId = 'd42e946e-33c0-4923-9e9a-6e449611d105'; // ID de la métrique de test

    try {
        // Test 1: Requête originale complète
        console.log('Test 1: Requête complète...');
        const sql1 = `
            SELECT 
                s.id,
                s.metric_id,
                s.objective_type_id,
                ot.label as type_label,
                s.unit_id,
                u.label as unit_label,
                s.weight,
                s.filter_conditions,
                s.data_source_table,
                s.data_source_value_column,
                s.data_source_filter_column
            FROM objective_metric_sources s
            LEFT JOIN objective_types ot ON s.objective_type_id = ot.id
            LEFT JOIN objective_units u ON s.unit_id = u.id
            WHERE s.metric_id = $1::uuid
            ORDER BY s.weight DESC
        `;

        const result1 = await query(sql1, [metricId]);
        console.log(`✅ Succès ! ${result1.rows.length} source(s) trouvée(s)`);
        console.log('Première source:', JSON.stringify(result1.rows[0], null, 2));

    } catch (error) {
        console.error('\n❌ ERREUR Test 1:', error.message);

        // Test 2: Sans les JOINs
        console.log('\nTest 2: Sans les JOINs...');
        try {
            const sql2 = `
                SELECT 
                    s.id,
                    s.metric_id,
                    s.objective_type_id,
                    s.unit_id
                FROM objective_metric_sources s
                WHERE s.metric_id = $1::uuid
            `;
            const result2 = await query(sql2, [metricId]);
            console.log(`✅ Succès ! ${result2.rows.length} source(s)`);
            console.log('Données source:', result2.rows);

            // Test 3: Vérifier les types de colonnes
            console.log('\nTest 3: Vérification des types de colonnes...');
            const sql3 = `
                SELECT 
                    column_name, 
                    data_type,
                    udt_name
                FROM information_schema.columns 
                WHERE table_name IN ('objective_metric_sources', 'objective_types', 'objective_units')
                AND column_name IN ('id', 'objective_type_id', 'unit_id')
                ORDER BY table_name, column_name
            `;
            const result3 = await query(sql3, []);
            console.log('\nTypes de colonnes:');
            result3.rows.forEach(row => {
                console.log(`  ${row.column_name} (table contains '${row.column_name}'): ${row.data_type} (${row.udt_name})`);
            });

        } catch (error2) {
            console.error('❌ ERREUR Test 2:', error2.message);
        }
    }

    process.exit(0);
}

testGetSources();
