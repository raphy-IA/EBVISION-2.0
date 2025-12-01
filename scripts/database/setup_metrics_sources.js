const { query } = require('../src/utils/database');

async function setupMetricsWithSources() {
    console.log('🔧 Configuration des métriques avec sources\n');

    try {
        // 1. Récupérer les IDs des types d'objectifs
        console.log('1️⃣  Récupération des types d\'objectifs...');
        const types = await query(`
            SELECT id, code, label, unit
            FROM objective_types
            WHERE is_active = TRUE
            ORDER BY code
        `);

        const typeMap = {};
        types.rows.forEach(t => {
            typeMap[t.code] = t;
            console.log(`   ✓ ${t.code} (ID: ${t.id})`);
        });

        // 2. Récupérer les IDs des unités
        console.log('\n2️⃣  Récupération des unités...');
        const units = await query(`
            SELECT id, code, label
            FROM objective_units
            WHERE is_active = TRUE
        `);

        const unitMap = {};
        units.rows.forEach(u => {
            unitMap[u.code] = u;
            console.log(`   ✓ ${u.code} (ID: ${u.id})`);
        });

        // 3. Récupérer les métriques existantes
        console.log('\n3️⃣  Récupération des métriques...');
        const metrics = await query(`
            SELECT m.id, m.code
            FROM objective_metrics m
            WHERE m.is_active = TRUE
        `);

        const metricMap = {};
        metrics.rows.forEach(m => {
            metricMap[m.code] = m;
            console.log(`   ✓ ${m.code} (ID: ${m.id})`);
        });

        // 4. Vider toutes les sources existantes
        console.log('\n4️⃣  Suppression des sources existantes...');
        await query('TRUNCATE TABLE objective_metric_sources CASCADE');
        console.log('   ✅ Sources supprimées\n');

        // 5. Configurer les métriques avec leurs sources
        console.log('5️⃣  Configuration des sources pour chaque métrique...\n');

        const configurations = [
            {
                metric: 'CA_TOTAL',
                sources: [
                    { type: 'CA_OPP', desc: 'CA Opportunités' },
                    { type: 'CA_MISSION', desc: 'CA Missions' }
                ]
            },
            {
                metric: 'CLIENTS_COUNT',
                sources: [
                    { type: 'NOUVEAUX_CLIENTS', desc: 'Nouveaux Clients' }
                ]
            },
            {
                metric: 'INVOICES_PAID',
                sources: [
                    { type: 'FACTURES_PAYEES', desc: 'Factures payées' }
                ]
            },
            {
                metric: 'CASH_COLLECTED',
                sources: [
                    { type: 'CA_ENCAISSE', desc: 'Montant encaissé' }
                ]
            }
        ];

        for (const config of configurations) {
            const metric = metricMap[config.metric];
            if (!metric) {
                console.log(`   ⚠️  Métrique ${config.metric} non trouvée, skip`);
                continue;
            }

            console.log(`   📊 ${config.metric}:`);

            for (const src of config.sources) {
                const objType = typeMap[src.type];
                if (!objType) {
                    console.log(`      ⚠️  Type ${src.type} non trouvé, skip`);
                    continue;
                }

                // Insérer la source
                await query(`
                    INSERT INTO objective_metric_sources (
                        metric_id,
                        objective_type_id,
                        unit_id,
                        weight,
                        filter_conditions,
                        data_source_table,
                        data_source_value_column,
                        data_source_filter_column
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [
                    metric.id,
                    objType.id,
                    null,
                    1.0,
                    null,
                    null,
                    null,
                    null
                ]);

                console.log(`      ✅ Source ajoutée: ${src.desc} (${objType.label})`);
            }
            console.log('');
        }

        // 6. Afficher le résumé
        console.log('6️⃣  RÉSUMÉ FINAL\n');
        const summary = await query(`
            SELECT 
                m.code,
                m.label,
                u.symbol as unit_symbol,
                COUNT(s.id) as source_count,
                STRING_AGG(ot.label, ', ') as sources
            FROM objective_metrics m
            LEFT JOIN objective_units u ON m.target_unit_id = u.id
            LEFT JOIN objective_metric_sources s ON s.metric_id = m.id
            LEFT JOIN objective_types ot ON s.objective_type_id = ot.id
            WHERE m.is_active = TRUE
            GROUP BY m.id, m.code, m.label, u.symbol
            ORDER BY m.code
        `);

        console.log('   Code                 Métrique                                  Unité  Sources');
        console.log('   ' + '─'.repeat(85));
        summary.rows.forEach(row => {
            const sources = row.sources || 'Aucune';
            console.log(`   ${row.code.padEnd(20)} ${row.label.padEnd(40)} ${(row.unit_symbol || '').padEnd(6)} ${row.source_count} - ${sources}`);
        });

        console.log('\n✅ CONFIGURATION TERMINÉE AVEC SUCCÈS !');
        console.log('\nVous pouvez maintenant tester les métriques dans l\'interface.\n');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error(error);
        process.exit(1);
    }
}

setupMetricsWithSources();
