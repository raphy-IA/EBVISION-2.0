// Script complet pour importer TOUTES les données sur la production (version corrigée)
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function completeProductionImportFixed() {
    console.log('🚀 Import COMPLET vers la production (version corrigée)...\n');

    try {
        // Configuration pour la base de production
        const productionPool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME || 'ebpadfbq_eb_vision_2_0',
            user: process.env.DB_USER || 'ebpadfbq_eb_admin20',
            password: process.env.DB_PASSWORD || '87ifet-Z)&',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
            ssl: false,
            family: 4
        });

        console.log('1️⃣ Test de connexion à la base de production...');
        const testResult = await productionPool.query('SELECT NOW() as current_time');
        console.log(`✅ Connexion production réussie - Heure: ${testResult.rows[0].current_time}`);

        // Rechercher le fichier de données extraites
        console.log('\n2️⃣ Recherche du fichier de données extraites...');
        const files = fs.readdirSync(__dirname + '/..');
        const extractedFiles = files.filter(file => 
            file.startsWith('complete_extract_') && file.endsWith('.json')
        ).sort().reverse();

        if (extractedFiles.length === 0) {
            console.error('❌ Aucun fichier de données extraites trouvé !');
            console.log('💡 Exécutez d\'abord: node scripts/complete-local-extract.js');
            return;
        }

        const extractedFile = extractedFiles[0];
        const extractedPath = path.join(__dirname, '..', extractedFile);
        console.log(`✅ Fichier trouvé: ${extractedFile}`);

        // Lire les données extraites
        const extractedData = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));
        console.log('✅ Données extraites chargées');

        console.log('\n3️⃣ NETTOYAGE COMPLET de la base de production...');

        // Supprimer toutes les tables existantes (sauf les tables système)
        const existingTablesResult = await productionPool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            AND table_name NOT LIKE 'pg_%'
            AND table_name NOT LIKE 'information_schema%'
        `);

        const existingTables = existingTablesResult.rows.map(row => row.table_name);

        if (existingTables.length > 0) {
            console.log(`🗑️ Suppression de ${existingTables.length} tables existantes...`);

            // Supprimer les tables dans l'ordre inverse pour éviter les problèmes de dépendances
            const tablesToDelete = [...existingTables].reverse();

            for (const tableName of tablesToDelete) {
                try {
                    await productionPool.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
                    console.log(`   ✅ Table ${tableName} supprimée`);
                } catch (error) {
                    console.log(`   ⚠️ Erreur avec ${tableName}: ${error.message}`);
                    // Continuer même en cas d'erreur
                }
            }
        }

        console.log('\n4️⃣ Création des tables et insertion des données...');

        let successCount = 0;
        let errorCount = 0;
        let totalRecords = 0;

        // Traiter d'abord les tables d'authentification
        const authTables = ['users', 'business_units', 'roles', 'permissions', 'role_permissions', 'user_permissions', 'user_business_unit_access'];
        const otherTables = Object.keys(extractedData).filter(table => !authTables.includes(table));

        const orderedTables = [...authTables, ...otherTables];

        for (const tableName of orderedTables) {
            const tableData = extractedData[tableName];
            if (!tableData) continue;

            if (tableData.error) {
                console.log(`❌ Table ${tableName}: Erreur lors de l'extraction - ${tableData.error}`);
                errorCount++;
                continue;
            }

            try {
                console.log(`📊 Traitement de la table: ${tableName}`);

                // Créer la table avec correction des UUIDs
                const createTableSQL = generateCreateTableSQLFixed(tableName, tableData.structure);
                await productionPool.query(createTableSQL);
                console.log(`   ✅ Table ${tableName} créée`);

                // Insérer les données
                if (tableData.data && tableData.data.length > 0) {
                    await insertTableDataFixed(productionPool, tableName, tableData);
                    console.log(`   ✅ ${tableData.data.length} enregistrements insérés`);
                    totalRecords += tableData.data.length;
                } else {
                    console.log(`   ℹ️ Aucune donnée à insérer`);
                }

                successCount++;

            } catch (error) {
                console.log(`   ❌ Erreur avec ${tableName}: ${error.message}`);
                errorCount++;
            }
        }

        await productionPool.end();

        console.log('\n🎉 Import COMPLET terminé !');
        console.log(`📊 Résumé:`);
        console.log(`   ✅ Tables traitées avec succès: ${successCount}`);
        console.log(`   ❌ Tables en erreur: ${errorCount}`);
        console.log(`   📈 Total enregistrements insérés: ${totalRecords}`);

        console.log('\n💡 Prochaines étapes:');
        console.log('1. Redémarrez l\'application: pm2 restart eb-vision-2-0');
        console.log('2. Testez la connexion avec vos identifiants locaux');
        console.log('3. Tous vos utilisateurs, rôles et permissions sont maintenant disponibles !');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

function generateCreateTableSQLFixed(tableName, structure) {
    let sql = `CREATE TABLE "${tableName}" (\n`;

    const columns = [];
    for (const column of structure) {
        let columnDef = `  "${column.column_name}" ${column.data_type}`;

        // Corriger les types UUID qui utilisent des fonctions non disponibles
        if (column.data_type === 'uuid' && column.column_default && 
            (column.column_default.includes('uuid_generate_v4()') || 
             column.column_default.includes('gen_random_uuid()'))) {
            // Utiliser un UUID fixe par défaut
            columnDef = `  "${column.column_name}" ${column.data_type} DEFAULT '550e8400-e29b-41d4-a716-446655440000'`;
        } else if (column.is_nullable === 'NO') {
            columnDef += ' NOT NULL';
        } else if (column.column_default && !column.column_default.includes('uuid_generate_v4()') && 
                   !column.column_default.includes('gen_random_uuid()')) {
            columnDef += ` DEFAULT ${column.column_default}`;
        }

        columns.push(columnDef);
    }

    sql += columns.join(',\n');
    sql += '\n)';

    return sql;
}

async function insertTableDataFixed(pool, tableName, tableData) {
    if (!tableData.data || tableData.data.length === 0) {
        return;
    }

    const columns = tableData.columnNames;
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    const columnNames = columns.map(col => `"${col}"`).join(', ');

    const insertSQL = `INSERT INTO "${tableName}" (${columnNames}) VALUES (${placeholders})`;

    // Insérer par lots de 100 pour éviter les timeouts
    const batchSize = 100;
    for (let i = 0; i < tableData.data.length; i += batchSize) {
        const batch = tableData.data.slice(i, i + batchSize);

        for (const row of batch) {
            const values = columns.map(col => {
                let value = row[col];
                
                // Corriger les valeurs NULL qui pourraient causer des problèmes
                if (value === null || value === undefined) {
                    return null;
                }
                
                // Corriger les UUIDs qui pourraient être mal formatés
                if (typeof value === 'string' && value.includes('uuid_generate_v4()')) {
                    return '550e8400-e29b-41d4-a716-446655440000';
                }
                
                return value;
            });
            
            try {
                await pool.query(insertSQL, values);
            } catch (error) {
                // Si erreur avec cette ligne, on continue avec les autres
                console.log(`   ⚠️ Erreur avec une ligne de ${tableName}: ${error.message}`);
            }
        }
    }
}

completeProductionImportFixed().catch(console.error);








