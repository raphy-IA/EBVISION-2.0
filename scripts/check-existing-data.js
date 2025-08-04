const { pool } = require('../src/utils/database');

async function checkExistingData() {
    console.log('🔍 Vérification des données existantes...\n');

    try {
        // 1. Vérifier les clients
        console.log('1. Clients existants:');
        const clientsCheck = await pool.query(`
            SELECT id, nom, code, statut
            FROM clients
            LIMIT 5
        `);
        
        if (clientsCheck.rows.length > 0) {
            clientsCheck.rows.forEach((client, index) => {
                console.log(`   ${index + 1}. ${client.nom} (${client.code}) - ${client.statut}`);
            });
        } else {
            console.log('   ❌ Aucun client trouvé');
        }

        // 2. Vérifier les missions
        console.log('\n2. Missions existantes:');
        const missionsCheck = await pool.query(`
            SELECT id, nom, code, client_id, statut
            FROM missions
            LIMIT 5
        `);
        
        if (missionsCheck.rows.length > 0) {
            missionsCheck.rows.forEach((mission, index) => {
                console.log(`   ${index + 1}. ${mission.nom} (${mission.code}) - Client: ${mission.client_id} - ${mission.statut}`);
            });
        } else {
            console.log('   ❌ Aucune mission trouvée');
        }

        // 3. Vérifier les factures
        console.log('\n3. Factures existantes:');
        const invoicesCheck = await pool.query(`
            SELECT id, numero_facture, mission_id, client_id, statut, montant_ttc
            FROM invoices
            LIMIT 5
        `);
        
        if (invoicesCheck.rows.length > 0) {
            invoicesCheck.rows.forEach((invoice, index) => {
                console.log(`   ${index + 1}. ${invoice.numero_facture} - Mission: ${invoice.mission_id} - Client: ${invoice.client_id} - ${invoice.statut} - ${invoice.montant_ttc}`);
            });
        } else {
            console.log('   ❌ Aucune facture trouvée');
        }

        // 4. Créer des données de test si nécessaire
        console.log('\n4. Création de données de test...');
        
        // Trouver un client valide ou en créer un
        let testClient;
        if (clientsCheck.rows.length > 0) {
            testClient = clientsCheck.rows[0];
            console.log(`✅ Utilisation du client existant: ${testClient.nom}`);
        } else {
            console.log('Création d\'un nouveau client...');
            const clientResult = await pool.query(`
                INSERT INTO clients (nom, code, email, statut)
                VALUES ($1, $2, $3, $4)
                RETURNING id, nom, code
            `, ['Client Test', 'CLI-TEST', 'test@test.com', 'ACTIF']);
            
            testClient = clientResult.rows[0];
            console.log(`✅ Client créé: ${testClient.nom}`);
        }

        // Trouver une mission valide ou en créer une
        let testMission;
        if (missionsCheck.rows.length > 0) {
            testMission = missionsCheck.rows[0];
            console.log(`✅ Utilisation de la mission existante: ${testMission.nom}`);
        } else {
            console.log('Création d\'une nouvelle mission...');
            const missionResult = await pool.query(`
                INSERT INTO missions (nom, code, description, client_id, date_debut, date_fin, statut, priorite)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, nom, code, client_id
            `, [
                'Mission Test',
                'MIS-TEST',
                'Mission de test pour facturation',
                testClient.id,
                new Date().toISOString().split('T')[0],
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                'EN_COURS',
                'NORMALE'
            ]);
            
            testMission = missionResult.rows[0];
            console.log(`✅ Mission créée: ${testMission.nom}`);
        }

        // Créer une facture de test
        if (invoicesCheck.rows.length === 0) {
            console.log('Création d\'une facture de test...');
            const invoiceResult = await pool.query(`
                INSERT INTO invoices (
                    mission_id, client_id, date_emission, date_echeance, statut,
                    conditions_paiement, taux_tva, adresse_facturation, notes_facture,
                    montant_ht, montant_tva, montant_ttc
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING id, numero_facture, statut
            `, [
                testMission.id,
                testClient.id,
                new Date().toISOString().split('T')[0],
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                'BROUILLON',
                'Paiement à 30 jours',
                19.25,
                'Adresse de facturation test',
                'Facture de test pour validation',
                20000.00,
                3850.00,
                23850.00
            ]);
            
            const testInvoice = invoiceResult.rows[0];
            console.log(`✅ Facture créée: ${testInvoice.numero_facture}`);
            
            // Afficher les URLs de test
            console.log('\n📋 URLs de test:');
            console.log(`   📄 Page des détails de mission: http://localhost:3000/mission-details.html?id=${testMission.id}`);
            console.log(`   📄 Page des détails de facture: http://localhost:3000/invoice-details.html?id=${testInvoice.id}`);
            console.log(`   📄 Liste des factures: http://localhost:3000/invoices.html`);
        } else {
            const existingInvoice = invoicesCheck.rows[0];
            console.log(`✅ Facture existante: ${existingInvoice.numero_facture}`);
            
            // Afficher les URLs de test
            console.log('\n📋 URLs de test:');
            console.log(`   📄 Page des détails de mission: http://localhost:3000/mission-details.html?id=${testMission.id}`);
            console.log(`   📄 Page des détails de facture: http://localhost:3000/invoice-details.html?id=${existingInvoice.id}`);
            console.log(`   📄 Liste des factures: http://localhost:3000/invoices.html`);
        }

        console.log('\n🎉 Vérification terminée !');
        console.log('\n📝 Instructions de test:');
        console.log('   1. Ouvrez votre navigateur');
        console.log('   2. Allez sur une des URLs affichées ci-dessus');
        console.log('   3. Testez la création de facture depuis une mission');
        console.log('   4. Testez l\'affichage des détails de facture');

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter la vérification
checkExistingData(); 