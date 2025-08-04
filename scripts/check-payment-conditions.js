const { pool } = require('../src/utils/database');

async function checkPaymentConditions() {
    console.log('🔍 Vérification des conditions de paiement...\n');

    try {
        // 1. Vérifier les missions avec conditions de paiement
        console.log('1. Missions avec conditions de paiement:');
        const missionsQuery = `
            SELECT 
                id, nom, code, 
                conditions_paiement,
                montant_honoraires,
                montant_debours,
                devise
            FROM missions 
            WHERE conditions_paiement IS NOT NULL 
            AND conditions_paiement != ''
            ORDER BY created_at DESC
            LIMIT 5
        `;
        
        const missionsResult = await pool.query(missionsQuery);
        
        if (missionsResult.rows.length === 0) {
            console.log('   ❌ Aucune mission avec conditions de paiement trouvée');
            return;
        }

        missionsResult.rows.forEach((mission, index) => {
            console.log(`\n   📋 Mission ${index + 1}: ${mission.nom} (${mission.code})`);
            console.log(`   - Honoraires: ${mission.montant_honoraires} ${mission.devise}`);
            console.log(`   - Débours: ${mission.montant_debours} ${mission.devise}`);
            console.log(`   - Conditions de paiement: ${mission.conditions_paiement}`);
            
            // Parser les conditions de paiement
            try {
                const conditions = JSON.parse(mission.conditions_paiement);
                console.log(`   - Nombre de tranches: ${conditions.length}`);
                
                conditions.forEach((tranche, trancheIndex) => {
                    console.log(`     Tranche ${trancheIndex + 1}:`);
                    console.log(`       - Honoraires: ${tranche.montantHonoraires} ${mission.devise} (${tranche.pourcentageHonoraires}%)`);
                    console.log(`       - Débours: ${tranche.montantDebours} ${mission.devise} (${tranche.pourcentageDebours}%)`);
                    console.log(`       - Date: ${tranche.datePrevisionnelle}`);
                    console.log(`       - Détails: ${tranche.details}`);
                });
            } catch (parseError) {
                console.log(`   ❌ Erreur de parsing JSON: ${parseError.message}`);
            }
        });

        // 2. Vérifier les factures existantes
        console.log('\n2. Factures existantes:');
        const invoicesQuery = `
            SELECT 
                id, numero_facture, statut,
                montant_ht, montant_tva, montant_ttc,
                mission_id, client_id
            FROM invoices 
            ORDER BY created_at DESC
            LIMIT 5
        `;
        
        const invoicesResult = await pool.query(invoicesQuery);
        
        if (invoicesResult.rows.length === 0) {
            console.log('   ❌ Aucune facture trouvée');
        } else {
            invoicesResult.rows.forEach((invoice, index) => {
                console.log(`\n   📄 Facture ${index + 1}: ${invoice.numero_facture}`);
                console.log(`   - Statut: ${invoice.statut}`);
                console.log(`   - Montant HT: ${invoice.montant_ht}`);
                console.log(`   - Montant TVA: ${invoice.montant_tva}`);
                console.log(`   - Montant TTC: ${invoice.montant_ttc}`);
                console.log(`   - Mission ID: ${invoice.mission_id}`);
            });
        }

        // 3. Vérifier les lignes de facture
        console.log('\n3. Lignes de facture existantes:');
        const itemsQuery = `
            SELECT 
                ii.id, ii.description, ii.quantite, ii.unite,
                ii.prix_unitaire, ii.montant_ht, ii.montant_ttc,
                i.numero_facture
            FROM invoice_items ii
            LEFT JOIN invoices i ON ii.invoice_id = i.id
            ORDER BY ii.created_at DESC
            LIMIT 10
        `;
        
        const itemsResult = await pool.query(itemsQuery);
        
        if (itemsResult.rows.length === 0) {
            console.log('   ❌ Aucune ligne de facture trouvée');
        } else {
            itemsResult.rows.forEach((item, index) => {
                console.log(`\n   📝 Ligne ${index + 1}:`);
                console.log(`   - Facture: ${item.numero_facture}`);
                console.log(`   - Description: ${item.description}`);
                console.log(`   - Quantité: ${item.quantite} ${item.unite}`);
                console.log(`   - Prix unitaire: ${item.prix_unitaire}`);
                console.log(`   - Montant HT: ${item.montant_ht}`);
                console.log(`   - Montant TTC: ${item.montant_ttc}`);
            });
        }

        console.log('\n🎉 Vérification terminée !');

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter la vérification
checkPaymentConditions(); 