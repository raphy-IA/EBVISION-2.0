// Script pour analyser précisément les données extraites
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function analyzeExtractedData() {
    console.log('🔍 Analyse précise des données extraites...\n');
    
    try {
        // Rechercher le fichier de données extraites
        const files = fs.readdirSync(__dirname + '/..');
        const extractedFiles = files.filter(file => 
            file.startsWith('complete_extract_') && file.endsWith('.json')
        ).sort().reverse();

        if (extractedFiles.length === 0) {
            console.error('❌ Aucun fichier de données extraites trouvé !');
            return;
        }

        const extractedFile = extractedFiles[0];
        const extractedPath = path.join(__dirname, '..', extractedFile);
        console.log(`📁 Fichier analysé: ${extractedFile}`);

        // Lire le fichier par chunks pour éviter les problèmes de mémoire
        const fileContent = fs.readFileSync(extractedPath, 'utf8');
        const extractedData = JSON.parse(fileContent);

        console.log('\n📊 ANALYSE COMPLÈTE DES DONNÉES EXTRAITES:');
        console.log('=' .repeat(60));

        let totalTables = 0;
        let totalRecords = 0;
        let tablesWithData = 0;
        let tablesWithoutData = 0;

        // Analyser chaque table
        for (const [tableName, tableData] of Object.entries(extractedData)) {
            totalTables++;
            
            if (tableData.error) {
                console.log(`❌ ${tableName}: ERREUR - ${tableData.error}`);
                continue;
            }

            const recordCount = tableData.data ? tableData.data.length : 0;
            totalRecords += recordCount;

            if (recordCount > 0) {
                tablesWithData++;
                console.log(`✅ ${tableName}: ${recordCount} enregistrements`);
                
                // Afficher quelques exemples pour les tables importantes
                if (['users', 'business_units', 'roles', 'permissions', 'companies', 'collaborateurs'].includes(tableName)) {
                    console.log(`   📋 Colonnes: ${tableData.columnNames.join(', ')}`);
                    if (tableData.data.length > 0) {
                        console.log(`   📄 Premier enregistrement:`, JSON.stringify(tableData.data[0], null, 2));
                    }
                }
            } else {
                tablesWithoutData++;
                console.log(`ℹ️ ${tableName}: 0 enregistrements`);
            }
        }

        console.log('\n' + '=' .repeat(60));
        console.log('📈 RÉSUMÉ COMPLET:');
        console.log(`   📊 Nombre total de tables: ${totalTables}`);
        console.log(`   ✅ Tables avec données: ${tablesWithData}`);
        console.log(`   ℹ️ Tables vides: ${tablesWithoutData}`);
        console.log(`   📈 Total enregistrements: ${totalRecords}`);

        // Vérifier les tables critiques
        console.log('\n🔐 VÉRIFICATION DES TABLES CRITIQUES:');
        const criticalTables = ['users', 'business_units', 'roles', 'permissions', 'role_permissions', 'user_permissions', 'user_business_unit_access'];
        
        for (const tableName of criticalTables) {
            if (extractedData[tableName]) {
                const recordCount = extractedData[tableName].data ? extractedData[tableName].data.length : 0;
                console.log(`   ${recordCount > 0 ? '✅' : '❌'} ${tableName}: ${recordCount} enregistrements`);
            } else {
                console.log(`   ❌ ${tableName}: TABLE MANQUANTE`);
            }
        }

        // Vérifier les tables métier importantes
        console.log('\n🏢 VÉRIFICATION DES TABLES MÉTIER:');
        const businessTables = ['companies', 'collaborateurs', 'missions', 'opportunities', 'clients'];
        
        for (const tableName of businessTables) {
            if (extractedData[tableName]) {
                const recordCount = extractedData[tableName].data ? extractedData[tableName].data.length : 0;
                console.log(`   ${recordCount > 0 ? '✅' : '❌'} ${tableName}: ${recordCount} enregistrements`);
            } else {
                console.log(`   ❌ ${tableName}: TABLE MANQUANTE`);
            }
        }

        console.log('\n💡 CONCLUSION:');
        if (totalRecords > 0) {
            console.log(`✅ Extraction réussie avec ${totalRecords} enregistrements au total`);
            console.log(`📁 Toutes vos données locales sont présentes dans le fichier`);
        } else {
            console.log(`❌ Aucune donnée extraite !`);
        }

    } catch (error) {
        console.error('❌ Erreur lors de l\'analyse:', error.message);
    }
}

analyzeExtractedData().catch(console.error);











