const { query } = require('../src/utils/database');

async function analyzeObjectivesAndMetrics() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  ANALYSE DES OBJECTIFS ET MÉTRIQUES EXISTANTS');
    console.log('═══════════════════════════════════════════════════\n');

    // 1. Objectifs existants
    console.log('1️⃣  TYPES D\'OBJECTIFS EXISTANTS');
    console.log('─'.repeat(50));
    const types = await query(`
        SELECT id, code, label, unit, category, entity_type
        FROM objective_types
        WHERE is_active = TRUE
        ORDER BY category, label
    `);

    console.log(`   Total: ${types.rows.length} types\n`);

    // Grouper par unité
    const byUnit = types.rows.reduce((acc, t) => {
        const unit = t.unit || 'SANS_UNITE';
        if (!acc[unit]) acc[unit] = [];
        acc[unit].push(t);
        return acc;
    }, {});

    Object.entries(byUnit).forEach(([unit, objectives]) => {
        console.log(`   📊 Unité: ${unit} (${objectives.length} objectifs)`);
        objectives.forEach(obj => {
            console.log(`      [${obj.id}] ${obj.code.padEnd(25)} ${obj.label}`);
        });
        console.log('');
    });

    // 2. Métriques existantes
    console.log('2️⃣  MÉTRIQUES EXISTANTES');
    console.log('─'.repeat(50));
    const metrics = await query(`
        SELECT m.id, m.code, m.label, u.code as unit_code,
               (SELECT COUNT(*) FROM objective_metric_sources s WHERE s.metric_id = m.id) as source_count
        FROM objective_metrics m
        LEFT JOIN objective_units u ON m.target_unit_id = u.id
        WHERE m.is_active = TRUE
        ORDER BY m.code
    `);

    console.log(`   Total: ${metrics.rows.length} métriques\n`);
    metrics.rows.forEach(m => {
        console.log(`   ${m.code.padEnd(20)} ${m.label.padEnd(40)} Unit: ${(m.unit_code || 'N/A').padEnd(12)} Sources: ${m.source_count}`);
    });

    // 3. Unités disponibles
    console.log('\n3️⃣  UNITÉS DISPONIBLES');
    console.log('─'.repeat(50));
    const units = await query(`
        SELECT code, label, symbol
        FROM objective_units
        WHERE is_active = TRUE
        ORDER BY code
    `);

    units.rows.forEach(u => {
        console.log(`   ${u.code.padEnd(15)} ${u.label.padEnd(30)} Symbol: ${u.symbol || 'N/A'}`);
    });

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  RECOMMANDATIONS');
    console.log('═══════════════════════════════════════════════════');
    console.log('Métriques suggérées:');
    console.log('1. CA Total (MONTANT) - Somme de tous les revenus');
    console.log('2. Nouveaux Clients (NOMBRE) - Total clients acquis');
    console.log('3. Factures Payées (NOMBRE) - Nombre de paiements');
    console.log('4. Chiffre Encaissé (MONTANT) - Total encaissements');

    process.exit(0);
}

analyzeObjectivesAndMetrics().catch(e => {
    console.error('Erreur:', e);
    process.exit(1);
});
