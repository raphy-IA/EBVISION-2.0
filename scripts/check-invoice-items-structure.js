const { pool } = require('../src/utils/database');

async function checkInvoiceItemsStructure() {
    try {
        console.log('🔍 Structure complète de la table invoice_items:');
        
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'invoice_items' 
            ORDER BY ordinal_position
        `);
        
        result.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''} ${col.column_default ? `DEFAULT: ${col.column_default}` : ''}`);
        });

        // Test d'insertion complet
        console.log('\n🧪 Test d\'insertion complet:');
        const testItem = {
            description: 'Test item complet',
            quantite: 2,
            unite: 'heure',
            prix_unitaire: 150,
            taux_tva: 19.25
        };

        const insertQuery = `
            INSERT INTO invoice_items (
                invoice_id, description, quantite, unite, prix_unitaire, taux_tva
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const insertValues = [
            'f5193818-68fa-4965-83cf-79a7302fe141', // ID de facture existant
            testItem.description,
            testItem.quantite,
            testItem.unite,
            testItem.prix_unitaire,
            testItem.taux_tva
        ];

        const insertResult = await pool.query(insertQuery, insertValues);
        console.log('✅ Insertion réussie:', insertResult.rows[0]);
        
        // Nettoyer
        await pool.query('DELETE FROM invoice_items WHERE id = $1', [insertResult.rows[0].id]);
        console.log('🧹 Test nettoyé');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkInvoiceItemsStructure(); 