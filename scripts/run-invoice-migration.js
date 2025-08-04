const { pool } = require('../src/utils/database');
const fs = require('fs');
const path = require('path');

async function runInvoiceMigration() {
    console.log('🔄 Exécution de la migration des factures...\n');

    try {
        // Lire le fichier de migration
        const migrationPath = path.join(__dirname, '../database/migrations/050_create_invoices_table.sql');
        const migrationContent = fs.readFileSync(migrationPath, 'utf8');

        // Diviser le contenu en requêtes individuelles
        const queries = migrationContent
            .split(';')
            .map(query => query.trim())
            .filter(query => query.length > 0 && !query.startsWith('--'));

        console.log(`📄 Exécution de ${queries.length} requêtes...\n`);

        for (let i = 0; i < queries.length; i++) {
            const query = queries[i];
            if (query.trim()) {
                try {
                    console.log(`🔄 Exécution de la requête ${i + 1}/${queries.length}...`);
                    await pool.query(query);
                    console.log(`✅ Requête ${i + 1} exécutée avec succès`);
                } catch (error) {
                    // Ignorer les erreurs de création d'index s'ils existent déjà
                    if (error.code === '42P07' && error.message.includes('already exists')) {
                        console.log(`⚠️  Index déjà existant, ignoré`);
                    } else {
                        console.error(`❌ Erreur lors de l'exécution de la requête ${i + 1}:`, error.message);
                    }
                }
            }
        }

        console.log('\n✅ Migration des factures terminée !');

        // Vérifier que la table a été créée
        const tableCheck = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'invoices'
        `);

        if (tableCheck.rows.length > 0) {
            console.log('✅ Table invoices créée avec succès');
            
            // Vérifier la structure de la table
            const structureCheck = await pool.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'invoices'
                ORDER BY ordinal_position
            `);

            console.log('\n📋 Structure de la table invoices:');
            structureCheck.rows.forEach(column => {
                console.log(`  - ${column.column_name}: ${column.data_type} ${column.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
            });

            // Vérifier les tables associées
            const relatedTables = ['invoice_items', 'invoice_payments'];
            for (const tableName of relatedTables) {
                const tableExists = await pool.query(`
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_name = $1
                `, [tableName]);

                if (tableExists.rows.length > 0) {
                    console.log(`✅ Table ${tableName} créée avec succès`);
                } else {
                    console.log(`❌ Table ${tableName} non trouvée`);
                }
            }
        } else {
            console.log('❌ Table invoices non trouvée après migration');
        }

    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution de la migration:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter la migration
runInvoiceMigration(); 