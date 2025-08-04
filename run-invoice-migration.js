const fs = require('fs');
const path = require('path');
const { pool } = require('./src/utils/database');

async function runInvoiceMigration() {
    try {
        console.log('🚀 Exécution de la migration de facturation...');
        
        // Lire le fichier de migration
        const migrationPath = path.join(__dirname, 'database/migrations/050_create_invoices_table.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📋 Contenu de la migration chargé');
        
        // Exécuter la migration
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Diviser le SQL en requêtes individuelles
            const queries = migrationSQL.split(';').filter(query => query.trim());
            
            for (let i = 0; i < queries.length; i++) {
                const query = queries[i].trim();
                if (query) {
                    console.log(`📊 Exécution de la requête ${i + 1}/${queries.length}`);
                    await client.query(query);
                }
            }
            
            await client.query('COMMIT');
            console.log('✅ Migration de facturation exécutée avec succès !');
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Erreur lors de l\'exécution de la migration:', error);
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution de la migration:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runInvoiceMigration(); 