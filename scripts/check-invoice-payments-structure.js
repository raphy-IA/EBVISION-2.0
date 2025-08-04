const { pool } = require('../src/utils/database');

async function checkInvoicePaymentsStructure() {
    console.log('🔍 Vérification de la structure de la table invoice_payments...\n');

    try {
        // Vérifier si la table existe
        const tableExistsQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'invoice_payments'
            );
        `;
        
        const tableExistsResult = await pool.query(tableExistsQuery);
        
        if (!tableExistsResult.rows[0].exists) {
            console.log('❌ La table invoice_payments n\'existe pas');
            return;
        }

        console.log('✅ La table invoice_payments existe');

        // Obtenir la structure de la table
        const structureQuery = `
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'invoice_payments'
            ORDER BY ordinal_position;
        `;
        
        const structureResult = await pool.query(structureQuery);
        
        console.log('\n📋 Structure de la table invoice_payments:');
        structureResult.rows.forEach(column => {
            console.log(`   - ${column.column_name}: ${column.data_type} ${column.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)'}`);
        });

        // Vérifier les données existantes
        const dataQuery = `
            SELECT COUNT(*) as total_payments
            FROM invoice_payments;
        `;
        
        const dataResult = await pool.query(dataQuery);
        console.log(`\n📊 Nombre total de paiements: ${dataResult.rows[0].total_payments}`);

        // Afficher quelques exemples
        if (parseInt(dataResult.rows[0].total_payments) > 0) {
            const sampleQuery = `
                SELECT * FROM invoice_payments 
                ORDER BY created_at DESC 
                LIMIT 3;
            `;
            
            const sampleResult = await pool.query(sampleQuery);
            console.log('\n📋 Exemples de paiements:');
            sampleResult.rows.forEach((payment, index) => {
                console.log(`   ${index + 1}. ID: ${payment.id}`);
                console.log(`      - Date: ${payment.date_paiement}`);
                console.log(`      - Montant: ${payment.montant}`);
                console.log(`      - Mode: ${payment.mode_paiement}`);
                console.log(`      - Statut: ${payment.statut}`);
            });
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter la vérification
checkInvoicePaymentsStructure(); 