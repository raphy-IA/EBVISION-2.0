const { pool } = require('../src/utils/database');

async function checkInvoiceTriggers() {
    console.log('🔍 Vérification des triggers de facturation...\n');

    try {
        // 1. Vérifier si la table invoices existe
        console.log('1. Vérification de la table invoices...');
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'invoices'
            );
        `);
        
        if (tableCheck.rows[0].exists) {
            console.log('✅ Table invoices existe');
        } else {
            console.log('❌ Table invoices n\'existe pas');
            return;
        }

        // 2. Vérifier la structure de la table
        console.log('\n2. Structure de la table invoices:');
        const structureCheck = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'invoices'
            ORDER BY ordinal_position;
        `);
        
        structureCheck.rows.forEach(col => {
            console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });

        // 3. Vérifier les triggers
        console.log('\n3. Vérification des triggers:');
        const triggersCheck = await pool.query(`
            SELECT trigger_name, event_manipulation, action_statement
            FROM information_schema.triggers
            WHERE event_object_table = 'invoices'
            ORDER BY trigger_name;
        `);
        
        if (triggersCheck.rows.length > 0) {
            triggersCheck.rows.forEach(trigger => {
                console.log(`   ✅ ${trigger.trigger_name} (${trigger.event_manipulation})`);
            });
        } else {
            console.log('   ❌ Aucun trigger trouvé');
        }

        // 4. Vérifier les fonctions
        console.log('\n4. Vérification des fonctions:');
        const functionsCheck = await pool.query(`
            SELECT routine_name
            FROM information_schema.routines
            WHERE routine_name IN ('generate_invoice_number', 'calculate_invoice_totals', 'update_invoice_payment_info')
            AND routine_schema = 'public';
        `);
        
        if (functionsCheck.rows.length > 0) {
            functionsCheck.rows.forEach(func => {
                console.log(`   ✅ ${func.routine_name}`);
            });
        } else {
            console.log('   ❌ Aucune fonction trouvée');
        }

        // 5. Vérifier la séquence
        console.log('\n5. Vérification de la séquence:');
        const sequenceCheck = await pool.query(`
            SELECT sequence_name, last_value, is_called
            FROM invoice_number_seq;
        `);
        
        if (sequenceCheck.rows.length > 0) {
            const seq = sequenceCheck.rows[0];
            console.log(`   ✅ Séquence invoice_number_seq (valeur: ${seq.last_value}, appelée: ${seq.is_called})`);
        } else {
            console.log('   ❌ Séquence invoice_number_seq non trouvée');
        }

        // 6. Tester la création d'une facture
        console.log('\n6. Test de création d\'une facture...');
        
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

        console.log('\n🎉 Vérification terminée !');

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter la vérification
checkInvoiceTriggers(); 