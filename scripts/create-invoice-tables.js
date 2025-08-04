const { pool } = require('../src/utils/database');

async function createInvoiceTables() {
    console.log('🔧 Création des tables de facturation manquantes...\n');

    try {
        // 1. Créer la table invoice_items
        console.log('1. Création de la table invoice_items...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS invoice_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
                task_id UUID REFERENCES tasks(id),
                description TEXT NOT NULL,
                quantite DECIMAL(10,2) NOT NULL DEFAULT 1,
                unite VARCHAR(50) DEFAULT 'heure',
                prix_unitaire DECIMAL(15,2) NOT NULL,
                montant_ht DECIMAL(15,2) NOT NULL,
                taux_tva DECIMAL(5,2) DEFAULT 19.25,
                montant_tva DECIMAL(15,2) NOT NULL,
                montant_ttc DECIMAL(15,2) NOT NULL,
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Table invoice_items créée');

        // 2. Créer les index pour invoice_items
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
            CREATE INDEX IF NOT EXISTS idx_invoice_items_task_id ON invoice_items(task_id);
        `);
        console.log('✅ Index pour invoice_items créés');

        // 3. Créer la table invoice_payments
        console.log('\n2. Création de la table invoice_payments...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS invoice_payments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
                montant DECIMAL(15,2) NOT NULL,
                date_paiement DATE NOT NULL,
                mode_paiement VARCHAR(50) NOT NULL,
                reference_paiement VARCHAR(100),
                statut VARCHAR(20) NOT NULL DEFAULT 'VALIDE',
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_by UUID REFERENCES users(id)
            );
        `);
        console.log('✅ Table invoice_payments créée');

        // 4. Créer les index pour invoice_payments
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
            CREATE INDEX IF NOT EXISTS idx_invoice_payments_date_paiement ON invoice_payments(date_paiement);
            CREATE INDEX IF NOT EXISTS idx_invoice_payments_statut ON invoice_payments(statut);
        `);
        console.log('✅ Index pour invoice_payments créés');

        // 5. Créer les triggers de mise à jour des timestamps
        console.log('\n3. Création des triggers de mise à jour...');
        await pool.query(`
            CREATE OR REPLACE FUNCTION update_invoice_items_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trigger_update_invoice_items_updated_at ON invoice_items;
            CREATE TRIGGER trigger_update_invoice_items_updated_at
                BEFORE UPDATE ON invoice_items
                FOR EACH ROW
                EXECUTE FUNCTION update_invoice_items_updated_at();

            CREATE OR REPLACE FUNCTION update_invoice_payments_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trigger_update_invoice_payments_updated_at ON invoice_payments;
            CREATE TRIGGER trigger_update_invoice_payments_updated_at
                BEFORE UPDATE ON invoice_payments
                FOR EACH ROW
                EXECUTE FUNCTION update_invoice_payments_updated_at();
        `);
        console.log('✅ Triggers de mise à jour créés');

        // 6. Vérifier que les tables existent
        console.log('\n4. Vérification des tables créées...');
        const tablesCheck = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name IN ('invoice_items', 'invoice_payments')
            AND table_schema = 'public';
        `);
        
        if (tablesCheck.rows.length === 2) {
            console.log('✅ Toutes les tables de facturation existent');
        } else {
            console.log('❌ Certaines tables sont manquantes');
        }

        console.log('\n🎉 Création des tables terminée !');

    } catch (error) {
        console.error('❌ Erreur lors de la création des tables:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter la création des tables
createInvoiceTables(); 