const { pool } = require('../src/utils/database');

async function checkInvoiceTables() {
    console.log('🔍 Vérification des tables de facturation...');
    
    try {
        // Vérifier la table invoices
        console.log('\n📋 Structure de la table invoices:');
        const invoicesStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'invoices' 
            ORDER BY ordinal_position
        `);
        
        invoicesStructure.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
        });

        // Vérifier la table invoice_items
        console.log('\n📋 Structure de la table invoice_items:');
        const itemsStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'invoice_items' 
            ORDER BY ordinal_position
        `);
        
        itemsStructure.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
        });

        // Vérifier les données existantes
        console.log('\n📊 Données dans invoices:');
        const invoices = await pool.query('SELECT id, numero_facture, statut FROM invoices LIMIT 5');
        invoices.rows.forEach((invoice, index) => {
            console.log(`  ${index + 1}. ${invoice.numero_facture} - ${invoice.statut} - ID: ${invoice.id}`);
        });

        console.log('\n📊 Données dans invoice_items:');
        const items = await pool.query('SELECT id, invoice_id, description, quantite, prix_unitaire FROM invoice_items LIMIT 5');
        items.rows.forEach((item, index) => {
            console.log(`  ${index + 1}. ${item.description} - ${item.quantite} x ${item.prix_unitaire} - ID: ${item.id}`);
        });

        // Test d'insertion d'un élément de facture
        if (invoices.rows.length > 0) {
            const testInvoiceId = invoices.rows[0].id;
            console.log(`\n🧪 Test d'insertion d'un élément de facture pour l'invoice ID: ${testInvoiceId}`);
            
            const testItem = {
                description: 'Test item',
                quantite: 1,
                unite: 'heure',
                prix_unitaire: 100,
                taux_tva: 19.25
            };

            const insertQuery = `
                INSERT INTO invoice_items (
                    invoice_id, description, quantite, unite, prix_unitaire, taux_tva
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;

            const insertValues = [
                testInvoiceId,
                testItem.description,
                testItem.quantite,
                testItem.unite,
                testItem.prix_unitaire,
                testItem.taux_tva
            ];

            try {
                const result = await pool.query(insertQuery, insertValues);
                console.log('✅ Test d\'insertion réussi:', result.rows[0]);
                
                // Nettoyer le test
                await pool.query('DELETE FROM invoice_items WHERE id = $1', [result.rows[0].id]);
                console.log('🧹 Test nettoyé');
            } catch (error) {
                console.error('❌ Erreur lors du test d\'insertion:', error.message);
            }
        }

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

checkInvoiceTables(); 