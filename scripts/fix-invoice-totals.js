const { pool } = require('../src/utils/database');

async function fixInvoiceTotals() {
    try {
        console.log('🔧 Correction des totaux de facture...');
        
        const invoiceId = '8c7814f2-6e61-443c-9b9a-a80c70f2db11';
        
        // Vérifier les données actuelles
        console.log('\n📊 État actuel:');
        const invoice = await pool.query('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
        const items = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [invoiceId]);
        
        console.log('Facture:', {
            numero: invoice.rows[0].numero_facture,
            montant_ht: invoice.rows[0].montant_ht,
            montant_tva: invoice.rows[0].montant_tva,
            montant_ttc: invoice.rows[0].montant_ttc
        });
        
        console.log(`\nLignes de facture (${items.rows.length}):`);
        let totalHT = 0;
        let totalTVA = 0;
        let totalTTC = 0;
        
        items.rows.forEach((item, index) => {
            console.log(`${index + 1}. ${item.description}: HT=${item.montant_ht}, TVA=${item.montant_tva}, TTC=${item.montant_ttc}`);
            totalHT += parseFloat(item.montant_ht || 0);
            totalTVA += parseFloat(item.montant_tva || 0);
            totalTTC += parseFloat(item.montant_ttc || 0);
        });
        
        console.log('\n🧮 Calculs manuels:');
        console.log(`Total HT: ${totalHT}`);
        console.log(`Total TVA: ${totalTVA}`);
        console.log(`Total TTC: ${totalTTC}`);
        
        // Corriger les totaux de la facture
        console.log('\n🔧 Mise à jour des totaux de la facture...');
        const updateQuery = `
            UPDATE invoices 
            SET 
                montant_ht = $1,
                montant_tva = $2,
                montant_ttc = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
        `;
        
        await pool.query(updateQuery, [totalHT, totalTVA, totalTTC, invoiceId]);
        
        // Vérifier après correction
        const updatedInvoice = await pool.query('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
        console.log('\n✅ Facture après correction:', {
            numero: updatedInvoice.rows[0].numero_facture,
            montant_ht: updatedInvoice.rows[0].montant_ht,
            montant_tva: updatedInvoice.rows[0].montant_tva,
            montant_ttc: updatedInvoice.rows[0].montant_ttc
        });
        
        // Test du trigger en ajoutant un élément
        console.log('\n🧪 Test du trigger avec nouvel élément...');
        const testItem = {
            description: 'Test trigger',
            quantite: 2,
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
            invoiceId,
            testItem.description,
            testItem.quantite,
            testItem.unite,
            testItem.prix_unitaire,
            testItem.taux_tva
        ];
        
        await pool.query(insertQuery, insertValues);
        
        // Vérifier si le trigger a fonctionné
        const finalInvoice = await pool.query('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
        const finalItems = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [invoiceId]);
        
        console.log('\n📊 État final après ajout:');
        console.log('Facture:', {
            numero: finalInvoice.rows[0].numero_facture,
            montant_ht: finalInvoice.rows[0].montant_ht,
            montant_tva: finalInvoice.rows[0].montant_tva,
            montant_ttc: finalInvoice.rows[0].montant_ttc
        });
        
        console.log(`Lignes de facture (${finalItems.rows.length}):`);
        let finalTotalHT = 0;
        let finalTotalTVA = 0;
        let finalTotalTTC = 0;
        
        finalItems.rows.forEach((item, index) => {
            console.log(`${index + 1}. ${item.description}: HT=${item.montant_ht}, TVA=${item.montant_tva}, TTC=${item.montant_ttc}`);
            finalTotalHT += parseFloat(item.montant_ht || 0);
            finalTotalTVA += parseFloat(item.montant_tva || 0);
            finalTotalTTC += parseFloat(item.montant_ttc || 0);
        });
        
        console.log('\n🧮 Totaux calculés manuellement:');
        console.log(`Total HT: ${finalTotalHT}`);
        console.log(`Total TVA: ${finalTotalTVA}`);
        console.log(`Total TTC: ${finalTotalTTC}`);
        
        // Nettoyer le test
        await pool.query('DELETE FROM invoice_items WHERE description = $1', ['Test trigger']);
        console.log('\n🧹 Test nettoyé');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

fixInvoiceTotals(); 