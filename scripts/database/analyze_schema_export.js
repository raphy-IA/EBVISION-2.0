const fs = require('fs');
const path = require('path');

// Lire le schema-export.json
const schemaPath = path.join(__dirname, 'schema-export.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

console.log('\n🔍 ANALYSE DE schema-export.json\n');
console.log('='
    .repeat(60));
console.log(`Exporté le: ${schema.exported_at}`);
console.log(`Base: ${schema.database}`);
console.log(`Nombre de tables: ${schema.total_tables}\n`);

// Tables critiques à vérifier
const criticalTables = [
    'prospecting_campaign_validation_companies',
    'payments',
    'payment_allocations',
    'bank_accounts',
    'financial_institutions'
];

console.log('📋 TABLES CRITIQUES DES MIGRATIONS RÉCENTES:\n');
criticalTables.forEach(table => {
    const exists = schema.tables[table] !== undefined;
    console.log(`   ${exists ? '✅' : '❌'} ${table}`);
});

// Vérifier manager_id dans missions
console.log('\n📋 COLONNES CRITIQUES:\n');
if (schema.tables.missions) {
    const hasManagerId = schema.tables.missions.columns.some(col => col.column_name === 'manager_id');
    console.log(`   ${hasManagerId ? '✅' : '❌'} missions.manager_id`);
} else {
    console.log('   ❌ Table missions non trouvée');
}

console.log('\n' + '='.repeat(60));
console.log('\n📊 CONCLUSION:');

const missingTables = criticalTables.filter(t => !schema.tables[t]);
const hasManagerId = schema.tables.missions && schema.tables.missions.columns.some(col => col.column_name === 'manager_id');

if (missingTables.length > 0 || !hasManagerId) {
    console.log(`   ⚠️  schema-export.json est OBSOLÈTE`);
    console.log(`   Manquant: ${missingTables.length} tables`);
    if (!hasManagerId) console.log(`   Manquant: colonne manager_id dans missions`);
    console.log('\n   💡 Recommandation:');
    console.log('   Générer un nouveau schema-export.json avec:');
    console.log('   node scripts/database/1-export-schema-local.js');
} else {
    console.log('   ✅ schema-export.json est à jour !');
}

console.log('');
