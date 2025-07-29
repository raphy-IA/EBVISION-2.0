const { pool } = require('../src/utils/database');

async function createOpportunitiesTable() {
    try {
        console.log('🚀 Création de la table opportunities...\n');
        
        // Étape 1: Créer la table de base
        console.log('1. Création de la table de base...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS opportunities (
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
        console.log('✅ Table créée avec succès');
        
        // Étape 2: Ajouter les contraintes CHECK
        console.log('\n2. Ajout des contraintes CHECK...');
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
        console.log('✅ Contraintes CHECK ajoutées');
        
        // Étape 3: Créer les index
        console.log('\n3. Création des index...');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_opportunities_client_id ON opportunities(client_id);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_opportunities_collaborateur_id ON opportunities(collaborateur_id);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_opportunities_statut ON opportunities(statut);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON opportunities(created_at);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_opportunities_date_fermeture_prevue ON opportunities(date_fermeture_prevue);');
        console.log('✅ Index créés');
        
        // Étape 4: Créer le trigger
        console.log('\n4. Création du trigger...');
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
            DROP TRIGGER IF EXISTS update_opportunities_updated_at ON opportunities;
            CREATE TRIGGER update_opportunities_updated_at
                BEFORE UPDATE ON opportunities
                FOR EACH ROW
                EXECUTE FUNCTION update_opportunities_updated_at();
        `);
        console.log('✅ Trigger créé');
        
        console.log('\n🎉 Table opportunities créée avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la création:', error);
    } finally {
        await pool.end();
    }
}

createOpportunitiesTable(); 