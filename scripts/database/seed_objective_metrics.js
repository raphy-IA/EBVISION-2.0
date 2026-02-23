
const { query } = require('../../src/utils/database');

async function seedMetrics() {
    console.log('🌱 Amorçage des métriques d\'objectifs...');

    try {
        // 1. Récupérer les unités nécessaires
        const unitsRes = await query('SELECT id, code FROM objective_units');
        const units = {};
        unitsRes.rows.forEach(u => units[u.code] = u.id);

        const countUnitId = units['COUNT'];
        const eurUnitId = units['EUR'];
        const xofUnitId = units['XOF']; // Fallback si pas d'EUR

        const currencyUnitId = eurUnitId || xofUnitId;

        if (!countUnitId || !currencyUnitId) {
            throw new Error('Unités nécessaires (COUNT, EUR/XOF) non trouvées dans la base de données.');
        }

        // 2. Définir les métriques à insérer
        const metrics = [
            {
                code: 'CA_TOTAL',
                label: 'Chiffre d\'Affaires Total',
                description: 'Somme du CA des opportunités gagnées et du revenu des missions terminées',
                calculation_type: 'SUM',
                target_unit_id: currencyUnitId
            },
            {
                code: 'NB_OPPORTUNITES',
                label: 'Nombre d\'Opportunités',
                description: 'Nombre total de nouvelles opportunités créées',
                calculation_type: 'SUM',
                target_unit_id: countUnitId
            },
            {
                code: 'NB_CONTRATS',
                label: 'Nombre de Contrats',
                description: 'Nombre d\'opportunités gagnées (équivalent contrats)',
                calculation_type: 'SUM',
                target_unit_id: countUnitId
            },
            {
                code: 'CLIENTS_COUNT',
                label: 'Nombre de Clients',
                description: 'Nombre de nouveaux clients créés',
                calculation_type: 'SUM',
                target_unit_id: countUnitId
            },
            {
                code: 'CASH_COLLECTED',
                label: 'Encaissements',
                description: 'Montant total des encaissements (factures payées)',
                calculation_type: 'SUM',
                target_unit_id: currencyUnitId
            }
        ];

        console.log('📊 Insertion des métriques...');
        const metricIdMap = {};

        for (const m of metrics) {
            const res = await query(`
                INSERT INTO objective_metrics (code, label, description, calculation_type, target_unit_id, is_active)
                VALUES ($1, $2, $3, $4, $5, TRUE)
                ON CONFLICT (code) DO UPDATE SET
                    label = EXCLUDED.label,
                    description = EXCLUDED.description,
                    calculation_type = EXCLUDED.calculation_type,
                    target_unit_id = EXCLUDED.target_unit_id,
                    is_active = TRUE,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id, code
            `, [m.code, m.label, m.description, m.calculation_type, m.target_unit_id]);

            metricIdMap[m.code] = res.rows[0].id;
            console.log(`   ✓ Métrique ${m.code} insérée/mise à jour`);
        }

        // 3. Récupérer les types d'objectifs nécessaires pour les sources
        const typesRes = await query('SELECT id, code FROM objective_types');
        const types = {};
        typesRes.rows.forEach(t => types[t.code] = t.id);

        // 4. Définir les sources
        const sources = [
            // CA_TOTAL <- OPPORTUNITIES WON + MISSIONS REVENUE
            { metric: 'CA_TOTAL', type: 'OPP_WON_AMOUNT', weight: 1.0 },
            { metric: 'CA_TOTAL', type: 'MISS_REVENUE', weight: 1.0 },

            // NB_OPPORTUNITES <- NEW OPPORTUNITIES
            { metric: 'NB_OPPORTUNITES', type: 'OPP_NEW_COUNT', weight: 1.0 },

            // NB_CONTRATS <- WON OPPORTUNITIES
            { metric: 'NB_CONTRATS', type: 'OPP_WON_COUNT', weight: 1.0 },

            // CLIENTS_COUNT <- NEW CLIENTS
            { metric: 'CLIENTS_COUNT', type: 'CLIENT_NEW', weight: 1.0 },

            // CASH_COLLECTED <- INVOICES PAID AMT
            { metric: 'CASH_COLLECTED', type: 'INV_PAID_AMT', weight: 1.0 }
        ];

        console.log('🔗 Insertion des sources...');

        // Optionnel: Nettoyer les sources existantes pour éviter les doublons si on relance
        await query('TRUNCATE TABLE objective_metric_sources CASCADE');

        for (const s of sources) {
            const metricId = metricIdMap[s.metric];
            const typeId = types[s.type];

            if (!metricId || !typeId) {
                console.warn(`   ⚠️  Métrique (${s.metric}) ou Type (${s.type}) introuvable, source ignorée.`);
                continue;
            }

            await query(`
                INSERT INTO objective_metric_sources (metric_id, objective_type_id, weight)
                VALUES ($1, $2, $3)
            `, [metricId, typeId, s.weight]);

            console.log(`   ✓ Source ${s.type} -> ${s.metric} ajoutée`);
        }

        console.log('✅ Amorçage terminé avec succès !');
    } catch (error) {
        console.error('❌ Erreur lors de l\'amorçage:', error);
    }
}

seedMetrics();
