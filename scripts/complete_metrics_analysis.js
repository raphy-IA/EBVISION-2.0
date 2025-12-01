const { query } = require('../src/utils/database');

async function completeAnalysis() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  ANALYSE COMPLÈTE DU SCHÉMA DES MÉTRIQUES');
    console.log('═══════════════════════════════════════════════════\n');

    // 1. SCHÉMA objective_types
    console.log('1️⃣  TABLE objective_types');
    console.log('─'.repeat(50));
    const typesSchema = await query(`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'objective_types'
        ORDER BY ordinal_position
    `);
    typesSchema.rows.forEach(col => {
        const indicator = col.column_name === 'id' ? ' ← ID' : '';
        console.log(`   ${col.column_name.padEnd(30)} ${col.data_type.padEnd(15)} (${col.udt_name})${indicator}`);
    });

    // 2. SCHÉMA objective_metric_sources
    console.log('\n2️⃣  TABLE objective_metric_sources');
    console.log('─'.repeat(50));
    const sourcesSchema = await query(`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'objective_metric_sources'
        ORDER BY ordinal_position
    `);
    sourcesSchema.rows.forEach(col => {
        const indicator = col.column_name === 'objective_type_id' ? ' ← FOREIGN KEY' : '';
        console.log(`   ${col.column_name.padEnd(30)} ${col.data_type.padEnd(15)} (${col.udt_name})${indicator}`);
    });

    // 3. DONNÉES EXISTANTES objective_types
    console.log('\n3️⃣  DONNÉES objective_types (sample)');
    console.log('─'.repeat(50));
    const typesData = await query(`
        SELECT id, code, label, unit
        FROM objective_types
        LIMIT 5
    `);
    console.log('   ID    CODE                    LABEL                          UNIT');
    typesData.rows.forEach(row => {
        console.log(`   ${String(row.id).padEnd(5)} ${(row.code || '').padEnd(23)} ${(row.label || '').padEnd(30)} ${row.unit || ''}`);
    });

    // 4. DONNÉES EXISTANTES objective_metric_sources
    console.log('\n4️⃣  DONNÉES objective_metric_sources');
    console.log('─'.repeat(50));
    const sourcesData = await query(`
        SELECT id, metric_id, objective_type_id, unit_id
        FROM objective_metric_sources
        LIMIT 5
    `);
    console.log(`   Nombre de sources: ${sourcesData.rows.length}`);
    if (sourcesData.rows.length > 0) {
        console.log('   ID                                    METRIC_ID                             OBJECTIVE_TYPE_ID                     UNIT_ID');
        sourcesData.rows.forEach(row => {
            console.log(`   ${row.id} ${row.metric_id} ${row.objective_type_id || 'NULL'.padEnd(36)} ${row.unit_id || 'NULL'}`);
        });
    } else {
        console.log('   (aucune donnée)');
    }

    // 5. ANALYSE DU PAYLOAD FRONTEND
    console.log('\n5️⃣  ANALYSE DU FRONTEND');
    console.log('─'.repeat(50));
    console.log('   Le frontend envoie:');
    console.log('   - sources[].objective_type_id: INTEGER (ex: 28)');
    console.log('   La BDD attend:');
    console.log('   - objective_metric_sources.objective_type_id: UUID');
    console.log('\n   ❌ PROBLÈME: Impossible de convertir INTEGER 28 en UUID');
    console.log('   ✅ SOLUTION: Utiliser NULL pour objective_type_id');
    console.log('              OU corriger le schéma BDD pour INTEGER');

    // 6. CONTRAINTES ET FOREIGN KEYS
    console.log('\n6️⃣  CONTRAINTES FOREIGN KEY');
    console.log('─'.repeat(50));
    const fkeys = await query(`
        SELECT
            tc.constraint_name,
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = 'objective_metric_sources'
    `);

    if (fkeys.rows.length > 0) {
        fkeys.rows.forEach(fk => {
            console.log(`   ${fk.constraint_name}`);
            console.log(`     ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        });
    } else {
        console.log('   (aucune contrainte FK trouvée)');
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  RECOMMANDATIONS');
    console.log('═══════════════════════════════════════════════════');
    console.log('1. Laisser objective_type_id = NULL dans objective_metric_sources');
    console.log('2. Utiliser uniquement data_source_table et filter_conditions');
    console.log('3. OU corriger le schéma: ALTER TABLE objective_metric_sources');
    console.log('   ALTER COLUMN objective_type_id TYPE INTEGER');

    process.exit(0);
}

completeAnalysis().catch(e => {
    console.error('\n❌ ERREUR:', e.message);
    console.error(e);
    process.exit(1);
});
