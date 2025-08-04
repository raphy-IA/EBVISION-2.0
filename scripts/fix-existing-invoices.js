const { pool } = require('../src/utils/database');

async function fixExistingInvoices() {
    console.log('🔧 Correction des factures existantes...\n');

    try {
        // 1. Trouver les factures sans numéro
        console.log('1. Recherche des factures sans numéro...');
        const invoicesCheck = await pool.query(`
            SELECT id, numero_facture, mission_id, client_id, statut, montant_ttc
            FROM invoices
            WHERE numero_facture IS NULL OR numero_facture = ''
            ORDER BY created_at;
        `);
        
        if (invoicesCheck.rows.length === 0) {
            console.log('✅ Toutes les factures ont déjà un numéro');
            return;
        }

        console.log(`📋 ${invoicesCheck.rows.length} factures à corriger:`);
        invoicesCheck.rows.forEach((invoice, index) => {
            console.log(`   ${index + 1}. ID: ${invoice.id} - Statut: ${invoice.statut} - Montant: ${invoice.montant_ttc}`);
        });

        // 2. Corriger chaque facture
        console.log('\n2. Correction des numéros de facture...');
        for (let i = 0; i < invoicesCheck.rows.length; i++) {
            const invoice = invoicesCheck.rows[i];
            
            // Générer un nouveau numéro de facture
            const newNumber = `FACT-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(i + 1).padStart(4, '0')}`;
            
            // Mettre à jour la facture
            await pool.query(`
                UPDATE invoices 
                SET numero_facture = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [newNumber, invoice.id]);
            
            console.log(`   ✅ Facture ${invoice.id} -> ${newNumber}`);
        }

        // 3. Vérifier le résultat
        console.log('\n3. Vérification des corrections...');
        const updatedInvoices = await pool.query(`
            SELECT id, numero_facture, statut, montant_ttc
            FROM invoices
            ORDER BY created_at;
        `);
        
        console.log('📋 Factures après correction:');
        updatedInvoices.rows.forEach((invoice, index) => {
            console.log(`   ${index + 1}. ${invoice.numero_facture} - ${invoice.statut} - ${invoice.montant_ttc}`);
        });

        console.log('\n🎉 Correction des factures terminée !');

    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter la correction
fixExistingInvoices(); 