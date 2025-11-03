// Script complet pour extraire TOUTES les données locales
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

async function completeLocalExtract() {
    console.log('🔍 Extraction COMPLÈTE des données locales...\n');
    
    try {
        // Configuration pour la base locale
        const localPool = new Pool({
            host: 'localhost',
            port: 5432,
            database: 'eb_vision_2_0',
            user: 'postgres',
            password: 'Canaan@2020',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000
        });

        console.log('1️⃣ Test de connexion à la base locale...');
        const testResult = await localPool.query('SELECT NOW() as current_time');
        console.log(`✅ Connexion locale réussie - Heure: ${testResult.rows[0].current_time}`);

        // Obtenir la liste de TOUTES les tables
        console.log('\n2️⃣ Récupération de la liste de toutes les tables...');
        const tablesResult = await localPool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);

        const allTables = tablesResult.rows.map(row => row.table_name);
        console.log(`📋 Nombre total de tables trouvées: ${allTables.length}`);

        const extractedData = {};

        console.log('\n3️⃣ Extraction de TOUTES les données...');
        
        for (const tableName of allTables) {
            try {
                console.log(`📊 Extraction de la table: ${tableName}`);
                
                // Obtenir la structure de la table
                const columnsResult = await localPool.query(`
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                    ORDER BY ordinal_position
                `, [tableName]);
                
                const columns = columnsResult.rows.map(col => col.column_name);
                
                // Extraire toutes les données de la table
                const dataResult = await localPool.query(`SELECT * FROM "${tableName}"`);
                
                extractedData[tableName] = {
                    structure: columnsResult.rows,
                    data: dataResult.rows,
                    columnNames: columns
                };
                
                console.log(`   ✅ ${dataResult.rows.length} enregistrements extraits`);
                
            } catch (error) {
                console.log(`   ❌ Erreur avec ${tableName}: ${error.message}`);
                extractedData[tableName] = {
                    error: error.message,
                    structure: [],
                    data: [],
                    columnNames: []
                };
            }
        }

        await localPool.end();

        // Sauvegarder les données extraites
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const filename = `complete_extract_${timestamp}.json`;
        fs.writeFileSync(filename, JSON.stringify(extractedData, null, 2));
        
        console.log('\n🎯 Extraction COMPLÈTE terminée !');
        console.log(`📁 Données sauvegardées dans: ${filename}`);
        
        // Afficher un résumé
        console.log('\n📊 Résumé de l\'extraction:');
        let totalRecords = 0;
        for (const [tableName, tableData] of Object.entries(extractedData)) {
            if (!tableData.error) {
                console.log(`   ${tableName}: ${tableData.data.length} enregistrements`);
                totalRecords += tableData.data.length;
            } else {
                console.log(`   ${tableName}: ❌ Erreur - ${tableData.error}`);
            }
        }
        console.log(`\n📈 Total: ${totalRecords} enregistrements extraits`);
        
        console.log('\n💡 Prochaines étapes:');
        console.log('1. Transférez ce fichier sur le serveur de production');
        console.log('2. Exécutez: node scripts/complete-production-import.js');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

completeLocalExtract().catch(console.error);



















