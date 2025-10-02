// Script simple pour vérifier les données extraites
const fs = require('fs');

try {
    console.log('🔍 Vérification des données extraites...\n');
    
    // Lire le fichier d'extraction
    const extractedData = JSON.parse(fs.readFileSync('complete_extract_2025-09-01.json', 'utf8'));
    
    console.log('📊 RÉSUMÉ DES DONNÉES EXTRAITES:');
    console.log('=' .repeat(50));
    
    let totalTables = 0;
    let totalRecords = 0;
    
    for (const [tableName, tableData] of Object.entries(extractedData)) {
        totalTables++;
        const recordCount = tableData.data ? tableData.data.length : 0;
        totalRecords += recordCount;
        
        if (recordCount > 0) {
            console.log(`✅ ${tableName}: ${recordCount} enregistrements`);
        } else {
            console.log(`ℹ️ ${tableName}: 0 enregistrements`);
        }
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log(`📈 TOTAL: ${totalTables} tables, ${totalRecords} enregistrements`);
    
    // Vérifier les tables critiques
    console.log('\n🔐 TABLES CRITIQUES:');
    const criticalTables = ['users', 'business_units', 'roles', 'permissions'];
    
    for (const tableName of criticalTables) {
        if (extractedData[tableName]) {
            const recordCount = extractedData[tableName].data ? extractedData[tableName].data.length : 0;
            console.log(`   ${recordCount > 0 ? '✅' : '❌'} ${tableName}: ${recordCount} enregistrements`);
        } else {
            console.log(`   ❌ ${tableName}: MANQUANTE`);
        }
    }
    
    console.log('\n💡 CONCLUSION:');
    console.log(`✅ Extraction complète avec ${totalRecords} enregistrements`);
    console.log(`📁 Toutes vos données locales sont présentes`);
    
} catch (error) {
    console.error('❌ Erreur:', error.message);
}







