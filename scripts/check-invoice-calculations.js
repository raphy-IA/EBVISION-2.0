const { pool } = require('../src/utils/database');

async function checkInvoiceCalculations() {
    try {
        console.log('🔍 Vérification des calculs automatiques des factures...');
        
        // Vérifier les triggers existants
        console.log('\n📋 Triggers sur invoice_items:');
        const triggers = await pool.query(`
            SELECT trigger_name, event_manipulation, action_statement
            FROM information_schema.triggers 
            WHERE event_object_table = 'invoice_items'
        `);
        
        triggers.rows.forEach(trigger => {
            console.log(`  - ${trigger.trigger_name}: ${trigger.event_manipulation} -> ${trigger.action_statement}`);
        });

        // Vérifier les données d'une facture spécifique
        const invoiceId = '8c7814f2-6e61-443c-9b9a-a80c70f2db11';
        console.log(`\n📊 Données de la facture ${invoiceId}:`);
        
        const invoice = await pool.query('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
        if (invoice.rows.length > 0) {
            console.log('Facture:', {
                numero: invoice.rows[0].numero_facture,
                montant_ht: invoice.rows[0].montant_ht,
                montant_tva: invoice.rows[0].montant_tva,
                montant_ttc: invoice.rows[0].montant_ttc
            });
        }

        // Vérifier les éléments de cette facture
        console.log('\n📊 Éléments de la facture:');
        const items = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at DESC', [invoiceId]);
        
        items.rows.forEach((item, index) => {
            console.log(`  ${index + 1}. ${item.description}:`);
            console.log(`     - Quantité: ${item.quantite} ${item.unite}`);
            console.log(`     - Prix unitaire: ${item.prix_unitaire}`);
            console.log(`     - Montant HT calculé: ${item.montant_ht}`);
            console.log(`     - Montant TVA calculé: ${item.montant_tva}`);
            console.log(`     - Montant TTC calculé: ${item.montant_ttc}`);
        });

        // Test de recalcul manuel
        if (items.rows.length > 0) {
            console.log('\n🧪 Test de recalcul manuel:');
            const testItem = items.rows[0];
            const expectedHT = testItem.quantite * testItem.prix_unitaire;
            const expectedTVA = expectedHT * (testItem.taux_tva / 100);
            const expectedTTC = expectedHT + expectedTVA;
            
            console.log(`  Calculs attendus pour ${testItem.description}:`);
            console.log(`    - HT: ${testItem.quantite} × ${testItem.prix_unitaire} = ${expectedHT}`);
            console.log(`    - TVA: ${expectedHT} × ${testItem.taux_tva}% = ${expectedTVA}`);
            console.log(`    - TTC: ${expectedHT} + ${expectedTVA} = ${expectedTTC}`);
            
            console.log(`  Valeurs actuelles:`);
            console.log(`    - HT: ${testItem.montant_ht}`);
            console.log(`    - TVA: ${testItem.montant_tva}`);
            console.log(`    - TTC: ${testItem.montant_ttc}`);
        }

        // Vérifier si les colonnes calculées fonctionnent
        console.log('\n🔧 Test d\'insertion avec calculs automatiques:');
        const testInsert = {
            description: 'Test calcul automatique',
            quantite: 5,
            unite: 'heure',
            prix_unitaire: 200,
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
            testInsert.description,
            testInsert.quantite,
            testInsert.unite,
            testInsert.prix_unitaire,
            testInsert.taux_tva
        ];

        const insertResult = await pool.query(insertQuery, insertValues);
        const newItem = insertResult.rows[0];
        
        console.log('✅ Nouvel élément inséré:');
        console.log(`  - Description: ${newItem.description}`);
        console.log(`  - Montant HT: ${newItem.montant_ht}`);
        console.log(`  - Montant TVA: ${newItem.montant_tva}`);
        console.log(`  - Montant TTC: ${newItem.montant_ttc}`);
        
        // Nettoyer le test
        await pool.query('DELETE FROM invoice_items WHERE id = $1', [newItem.id]);
        console.log('🧹 Test nettoyé');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkInvoiceCalculations(); 