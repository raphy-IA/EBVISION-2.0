const { pool } = require('../src/utils/database');

async function fixOpportunitiesTable() {
    try {
        console.log('🔧 Correction de la structure de la table opportunities...\n');
        
        // Étape 1: Vérifier la structure actuelle
        console.log('1. Structure actuelle:');
        const currentStructure = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'opportunities'
            ORDER BY ordinal_position;
        `);
        
        currentStructure.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type}`);
        });
        
        // Étape 2: Supprimer la table existante et la recréer
        console.log('\n2. Suppression et recréation de la table...');
        await pool.query('DROP TABLE IF EXISTS opportunities CASCADE;');
        
        // Étape 3: Créer la nouvelle table avec la bonne structure
        console.log('3. Création de la nouvelle table...');
        await pool.query(`
            CREATE TABLE opportunities (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nom VARCHAR(255) NOT NULL,
                description TEXT,
                client_id UUID,
                collaborateur_id UUID,
                statut VARCHAR(50) NOT NULL DEFAULT 'NOUVELLE',
                type_opportunite VARCHAR(100),
                source VARCHAR(100),
                probabilite INTEGER DEFAULT 0,
                montant_estime DECIMAL(15,2),
                devise VARCHAR(5) DEFAULT 'FCFA',
                date_fermeture_prevue DATE,
                date_fermeture_reelle DATE,
                etape_vente VARCHAR(50) DEFAULT 'PROSPECTION',
                notes TEXT,
                created_by UUID,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_by UUID,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Étape 4: Ajouter les contraintes
        console.log('4. Ajout des contraintes...');
        await pool.query(`
            ALTER TABLE opportunities 
            ADD CONSTRAINT check_statut 
            CHECK (statut IN ('NOUVELLE', 'EN_COURS', 'GAGNEE', 'PERDUE', 'ANNULEE'));
        `);
        
        await pool.query(`
            ALTER TABLE opportunities 
            ADD CONSTRAINT check_probabilite 
            CHECK (probabilite >= 0 AND probabilite <= 100);
        `);
        
        await pool.query(`
            ALTER TABLE opportunities 
            ADD CONSTRAINT check_etape_vente 
            CHECK (etape_vente IN ('PROSPECTION', 'QUALIFICATION', 'PROPOSITION', 'NEGOCIATION', 'FERMETURE'));
        `);
        
        // Étape 5: Créer les index
        console.log('5. Création des index...');
        await pool.query('CREATE INDEX idx_opportunities_client_id ON opportunities(client_id);');
        await pool.query('CREATE INDEX idx_opportunities_collaborateur_id ON opportunities(collaborateur_id);');
        await pool.query('CREATE INDEX idx_opportunities_statut ON opportunities(statut);');
        await pool.query('CREATE INDEX idx_opportunities_created_at ON opportunities(created_at);');
        await pool.query('CREATE INDEX idx_opportunities_date_fermeture_prevue ON opportunities(date_fermeture_prevue);');
        
        // Étape 6: Créer le trigger
        console.log('6. Création du trigger...');
        await pool.query(`
            CREATE OR REPLACE FUNCTION update_opportunities_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);
        
        await pool.query(`
            CREATE TRIGGER update_opportunities_updated_at
                BEFORE UPDATE ON opportunities
                FOR EACH ROW
                EXECUTE FUNCTION update_opportunities_updated_at();
        `);
        
        // Étape 7: Ajouter des données de test
        console.log('7. Ajout de données de test...');
        await pool.query(`
            INSERT INTO opportunities (
                nom, description, statut, type_opportunite, source, 
                probabilite, montant_estime, devise, etape_vente, notes
            ) VALUES 
            ('Opportunité Test 1', 'Description de test 1', 'NOUVELLE', 'VENTE', 'REFERRAL', 25, 50000.00, 'FCFA', 'PROSPECTION', 'Note de test 1'),
            ('Opportunité Test 2', 'Description de test 2', 'EN_COURS', 'SERVICE', 'WEBSITE', 50, 75000.00, 'FCFA', 'QUALIFICATION', 'Note de test 2'),
            ('Opportunité Test 3', 'Description de test 3', 'GAGNEE', 'CONSULTING', 'PARTENAIRE', 100, 120000.00, 'FCFA', 'FERMETURE', 'Note de test 3');
        `);
        
        console.log('\n🎉 Table opportunities corrigée avec succès !');
        
        // Étape 8: Vérifier la nouvelle structure
        console.log('\n8. Nouvelle structure:');
        const newStructure = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'opportunities'
            ORDER BY ordinal_position;
        `);
        
        newStructure.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type}`);
        });
        
        const count = await pool.query('SELECT COUNT(*) as total FROM opportunities;');
        console.log(`\n📊 Nombre d'opportunités: ${count.rows[0].total}`);
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

fixOpportunitiesTable(); 