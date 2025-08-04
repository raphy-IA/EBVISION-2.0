const { pool } = require('../src/utils/database');

async function installInvoiceTriggers() {
    console.log('🔧 Installation des triggers de facturation...\n');

    try {
        // 1. Créer la séquence pour les numéros de facture
        console.log('1. Création de la séquence...');
        await pool.query(`
            CREATE SEQUENCE IF NOT EXISTS invoice_number_seq
                START WITH 1
                INCREMENT BY 1
                NO CYCLE;
        `);
        console.log('✅ Séquence invoice_number_seq créée');

        // 2. Fonction pour générer automatiquement le numéro de facture
        console.log('\n2. Création de la fonction generate_invoice_number...');
        await pool.query(`
            CREATE OR REPLACE FUNCTION generate_invoice_number()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW.numero_facture IS NULL OR NEW.numero_facture = '' THEN
                    NEW.numero_facture := 'FACT-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(NEXTVAL('invoice_number_seq')::TEXT, 4, '0');
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log('✅ Fonction generate_invoice_number créée');

        // 3. Trigger pour générer automatiquement le numéro de facture
        console.log('\n3. Création du trigger generate_invoice_number...');
        await pool.query(`
            DROP TRIGGER IF EXISTS trigger_generate_invoice_number ON invoices;
            CREATE TRIGGER trigger_generate_invoice_number
                BEFORE INSERT ON invoices
                FOR EACH ROW
                EXECUTE FUNCTION generate_invoice_number();
        `);
        console.log('✅ Trigger trigger_generate_invoice_number créé');

        // 4. Fonction pour calculer les totaux des factures
        console.log('\n4. Création de la fonction calculate_invoice_totals...');
        await pool.query(`
            CREATE OR REPLACE FUNCTION calculate_invoice_totals()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Mettre à jour les montants de la facture basés sur les lignes
                UPDATE invoices 
                SET 
                    montant_ht = COALESCE((
                        SELECT SUM(montant_ht) 
                        FROM invoice_items 
                        WHERE invoice_id = NEW.invoice_id
                    ), 0),
                    montant_tva = COALESCE((
                        SELECT SUM(montant_tva) 
                        FROM invoice_items 
                        WHERE invoice_id = NEW.invoice_id
                    ), 0),
                    montant_ttc = COALESCE((
                        SELECT SUM(montant_ttc) 
                        FROM invoice_items 
                        WHERE invoice_id = NEW.invoice_id
                    ), 0)
                WHERE id = NEW.invoice_id;
                
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log('✅ Fonction calculate_invoice_totals créée');

        // 5. Triggers pour recalculer les totaux
        console.log('\n5. Création des triggers calculate_invoice_totals...');
        await pool.query(`
            DROP TRIGGER IF EXISTS trigger_calculate_invoice_totals_insert ON invoice_items;
            DROP TRIGGER IF EXISTS trigger_calculate_invoice_totals_update ON invoice_items;
            DROP TRIGGER IF EXISTS trigger_calculate_invoice_totals_delete ON invoice_items;
            
            CREATE TRIGGER trigger_calculate_invoice_totals_insert
                AFTER INSERT ON invoice_items
                FOR EACH ROW
                EXECUTE FUNCTION calculate_invoice_totals();

            CREATE TRIGGER trigger_calculate_invoice_totals_update
                AFTER UPDATE ON invoice_items
                FOR EACH ROW
                EXECUTE FUNCTION calculate_invoice_totals();

            CREATE TRIGGER trigger_calculate_invoice_totals_delete
                AFTER DELETE ON invoice_items
                FOR EACH ROW
                EXECUTE FUNCTION calculate_invoice_totals();
        `);
        console.log('✅ Triggers calculate_invoice_totals créés');

        // 6. Fonction pour mettre à jour les informations de paiement
        console.log('\n6. Création de la fonction update_invoice_payment_info...');
        await pool.query(`
            CREATE OR REPLACE FUNCTION update_invoice_payment_info()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Mettre à jour les informations de paiement de la facture
                UPDATE invoices 
                SET 
                    montant_paye = COALESCE((
                        SELECT SUM(montant) 
                        FROM invoice_payments 
                        WHERE invoice_id = NEW.invoice_id AND statut = 'VALIDE'
                    ), 0),
                    date_premier_paiement = (
                        SELECT MIN(date_paiement) 
                        FROM invoice_payments 
                        WHERE invoice_id = NEW.invoice_id AND statut = 'VALIDE'
                    ),
                    date_dernier_paiement = (
                        SELECT MAX(date_paiement) 
                        FROM invoice_payments 
                        WHERE invoice_id = NEW.invoice_id AND statut = 'VALIDE'
                    ),
                    nombre_paiements = (
                        SELECT COUNT(*) 
                        FROM invoice_payments 
                        WHERE invoice_id = NEW.invoice_id AND statut = 'VALIDE'
                    )
                WHERE id = NEW.invoice_id;
                
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log('✅ Fonction update_invoice_payment_info créée');

        // 7. Triggers pour mettre à jour les informations de paiement
        console.log('\n7. Création des triggers update_invoice_payment_info...');
        await pool.query(`
            DROP TRIGGER IF EXISTS trigger_update_invoice_payment_info_insert ON invoice_payments;
            DROP TRIGGER IF EXISTS trigger_update_invoice_payment_info_update ON invoice_payments;
            DROP TRIGGER IF EXISTS trigger_update_invoice_payment_info_delete ON invoice_payments;
            
            CREATE TRIGGER trigger_update_invoice_payment_info_insert
                AFTER INSERT ON invoice_payments
                FOR EACH ROW
                EXECUTE FUNCTION update_invoice_payment_info();

            CREATE TRIGGER trigger_update_invoice_payment_info_update
                AFTER UPDATE ON invoice_payments
                FOR EACH ROW
                EXECUTE FUNCTION update_invoice_payment_info();

            CREATE TRIGGER trigger_update_invoice_payment_info_delete
                AFTER DELETE ON invoice_payments
                FOR EACH ROW
                EXECUTE FUNCTION update_invoice_payment_info();
        `);
        console.log('✅ Triggers update_invoice_payment_info créés');

        // 8. Tester la création d'une facture
        console.log('\n8. Test de création d\'une facture...');
        
        // Trouver une mission et un client existants
        const missionCheck = await pool.query(`
            SELECT id, nom FROM missions LIMIT 1;
        `);
        
        const clientCheck = await pool.query(`
            SELECT id, nom FROM clients LIMIT 1;
        `);
        
        if (missionCheck.rows.length > 0 && clientCheck.rows.length > 0) {
            const testMission = missionCheck.rows[0];
            const testClient = clientCheck.rows[0];
            
            console.log(`   Mission de test: ${testMission.nom}`);
            console.log(`   Client de test: ${testClient.nom}`);
            
            // Créer une facture de test
            const testInvoiceQuery = `
                INSERT INTO invoices (
                    mission_id, client_id, date_emission, date_echeance, statut,
                    conditions_paiement, taux_tva, adresse_facturation, notes_facture
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id, numero_facture, statut;
            `;
            
            const testInvoiceValues = [
                testMission.id,
                testClient.id,
                new Date().toISOString().split('T')[0],
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                'BROUILLON',
                'Paiement à 30 jours',
                19.25,
                'Adresse de test',
                'Facture de test pour validation triggers'
            ];
            
            const testInvoiceResult = await pool.query(testInvoiceQuery, testInvoiceValues);
            const testInvoice = testInvoiceResult.rows[0];
            
            console.log(`   ✅ Facture de test créée: ${testInvoice.numero_facture} (${testInvoice.statut})`);
            
            // Supprimer la facture de test
            await pool.query(`DELETE FROM invoices WHERE id = $1`, [testInvoice.id]);
            console.log('   🗑️ Facture de test supprimée');
            
        } else {
            console.log('   ❌ Impossible de créer une facture de test (mission ou client manquant)');
        }

        console.log('\n🎉 Installation des triggers terminée !');

    } catch (error) {
        console.error('❌ Erreur lors de l\'installation:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter l'installation
installInvoiceTriggers(); 