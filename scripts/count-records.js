const fs = require('fs');

console.log('🔍 Comptage des enregistrements extraits...\n');

try {
    const data = JSON.parse(fs.readFileSync('complete_extract_2025-09-01.json', 'utf8'));
    
    let totalRecords = 0;
    let tableCount = 0;
    
    console.log('📊 ENREGISTREMENTS PAR TABLE:');
    console.log('=' .repeat(40));
    
    for (const [tableName, tableData] of Object.entries(data)) {
        tableCount++;
        const records = tableData.data ? tableData.data.length : 0;
        totalRecords += records;
        
        if (records > 0) {
            console.log(`${tableName}: ${records} enregistrements`);
        }
    }
    
    console.log('\n' + '=' .repeat(40));
    console.log(`📈 TOTAL: ${tableCount} tables, ${totalRecords} enregistrements`);
    
    // Vérifier les tables critiques
    console.log('\n🔐 TABLES CRITIQUES:');
    const critical = ['users', 'business_units', 'roles', 'permissions', 'companies'];
    
    for (const table of critical) {
        if (data[table]) {
            const count = data[table].data ? data[table].data.length : 0;
            console.log(`  ${table}: ${count} enregistrements`);
        } else {
            console.log(`  ${table}: MANQUANTE`);
        }
    }
    
} catch (error) {
    console.error('Erreur:', error.message);
}









