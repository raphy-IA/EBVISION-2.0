const { pool } = require('../src/utils/database');

async function fixInvoicesTable() {
    console.log('🔧 Correction de la structure de la table invoices...\n');

    try {
        // Vérifier la structure actuelle
        console.log('📋 Structure actuelle de la table invoices:');
        const structureCheck = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'invoices'
            ORDER BY ordinal_position
        `);

        structureCheck.rows.forEach(column => {
            console.log(`  - ${column.column_name}: ${column.data_type} ${column.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
        });

        // Ajouter les colonnes manquantes
        console.log('\n🔧 Ajout des colonnes manquantes...');

        const missingColumns = [
            'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS numero_facture VARCHAR(50) UNIQUE',
            'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS conditions_paiement TEXT',
            'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS taux_tva DECIMAL(5,2) DEFAULT 19.25',
            'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS adresse_facturation TEXT',
            'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes_facture TEXT',
            'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS date_premier_paiement DATE',
            'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS date_dernier_paiement DATE',
            'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS nombre_paiements INTEGER DEFAULT 0',
            'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id)',
            'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id)',
            'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS montant_paye DECIMAL(15,2) NOT NULL DEFAULT 0',
            'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS montant_restant DECIMAL(15,2) GENERATED ALWAYS AS (montant_ttc - montant_paye) STORED'
        ];

        for (const query of missingColumns) {
            try {
                await pool.query(query);
                console.log(`✅ ${query.split(' ')[5]} ajoutée`);
            } catch (error) {
                console.log(`⚠️  ${query.split(' ')[5]} déjà existante ou erreur: ${error.message}`);
            }
        }

        // Supprimer les colonnes obsolètes
        console.log('\n🗑️  Suppression des colonnes obsolètes...');
        const obsoleteColumns = [
            'ALTER TABLE invoices DROP COLUMN IF EXISTS numero',
            'ALTER TABLE invoices DROP COLUMN IF EXISTS mode_paiement',
            'ALTER TABLE invoices DROP COLUMN IF EXISTS date_paiement'
        ];

        for (const query of obsoleteColumns) {
            try {
                await pool.query(query);
                console.log(`✅ Colonne obsolète supprimée`);
            } catch (error) {
                console.log(`⚠️  Colonne déjà supprimée ou erreur: ${error.message}`);
            }
        }

        // Vérifier la structure finale
        console.log('\n📋 Structure finale de la table invoices:');
        const finalStructureCheck = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'invoices'
            ORDER BY ordinal_position
        `);

        finalStructureCheck.rows.forEach(column => {
            console.log(`  - ${column.column_name}: ${column.data_type} ${column.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
        });

        console.log('\n✅ Structure de la table invoices corrigée !');

    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter la correction
fixInvoicesTable(); 