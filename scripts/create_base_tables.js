const { pool } = require('../src/utils/database');

async function createBaseTables() {
    try {
        console.log('🔧 Création des tables de base...');
        
        // Créer la table utilisateurs si elle n'existe pas
        await pool.query(`
            CREATE TABLE IF NOT EXISTS utilisateurs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nom VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                mot_de_passe VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'utilisateur',
                actif BOOLEAN DEFAULT true,
                date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                date_modification TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Créer la table divisions si elle n'existe pas
        await pool.query(`
            CREATE TABLE IF NOT EXISTS divisions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nom VARCHAR(255) NOT NULL,
                description TEXT,
                responsable_id UUID,
                date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                date_modification TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Créer la table clients
        await pool.query('DROP TABLE IF EXISTS clients CASCADE');
        
        const createClientsSQL = `
            CREATE TABLE clients (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nom VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                telephone VARCHAR(50),
                adresse TEXT,
                ville VARCHAR(100),
                code_postal VARCHAR(20),
                pays VARCHAR(100) DEFAULT 'France',
                secteur_activite VARCHAR(100),
                taille_entreprise VARCHAR(50),
                statut VARCHAR(50) NOT NULL DEFAULT 'prospect',
                source_prospection VARCHAR(100),
                notes TEXT,
                date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                date_modification TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                date_derniere_activite TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                collaborateur_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL,
                created_by UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
                updated_by UUID REFERENCES utilisateurs(id) ON DELETE SET NULL
            )
        `;
        
        await pool.query(createClientsSQL);
        
        // Créer la table missions
        await pool.query('DROP TABLE IF EXISTS missions CASCADE');
        
        const createMissionsSQL = `
            CREATE TABLE missions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                titre VARCHAR(255) NOT NULL,
                description TEXT,
                client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                statut VARCHAR(50) NOT NULL DEFAULT 'en_cours',
                type_mission VARCHAR(100),
                date_debut DATE,
                date_fin_prevue DATE,
                date_fin_reelle DATE,
                budget_prevue DECIMAL(12,2),
                budget_reel DECIMAL(12,2),
                taux_horaire_moyen DECIMAL(8,2),
                montant_total DECIMAL(12,2),
                priorite VARCHAR(20) DEFAULT 'normale',
                division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
                responsable_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL,
                notes TEXT,
                date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                date_modification TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_by UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
                updated_by UUID REFERENCES utilisateurs(id) ON DELETE SET NULL
            )
        `;
        
        await pool.query(createMissionsSQL);
        
        // Créer la table equipes_mission
        await pool.query('DROP TABLE IF EXISTS equipes_mission CASCADE');
        
        const createEquipesMissionSQL = `
            CREATE TABLE equipes_mission (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
                collaborateur_id UUID NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
                role VARCHAR(100),
                taux_horaire_mission DECIMAL(8,2),
                date_debut_participation DATE,
                date_fin_participation DATE,
                pourcentage_charge DECIMAL(5,2) DEFAULT 100.00,
                date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                date_modification TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(mission_id, collaborateur_id)
            )
        `;
        
        await pool.query(createEquipesMissionSQL);
        
        // Créer la table opportunites
        await pool.query('DROP TABLE IF EXISTS opportunites CASCADE');
        
        const createOpportunitesSQL = `
            CREATE TABLE opportunites (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                titre VARCHAR(255) NOT NULL,
                description TEXT,
                client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                statut VARCHAR(50) NOT NULL DEFAULT 'identification',
                probabilite DECIMAL(5,2) DEFAULT 0.00,
                montant_estime DECIMAL(12,2),
                date_limite DATE,
                date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                date_modification TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                date_fermeture TIMESTAMP WITH TIME ZONE,
                raison_fermeture VARCHAR(255),
                collaborateur_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL,
                created_by UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
                updated_by UUID REFERENCES utilisateurs(id) ON DELETE SET NULL
            )
        `;
        
        await pool.query(createOpportunitesSQL);
        
        // Créer les index
        await pool.query('CREATE INDEX idx_clients_statut ON clients(statut)');
        await pool.query('CREATE INDEX idx_clients_collaborateur ON clients(collaborateur_id)');
        await pool.query('CREATE INDEX idx_clients_date_creation ON clients(date_creation)');
        await pool.query('CREATE INDEX idx_missions_client ON missions(client_id)');
        await pool.query('CREATE INDEX idx_missions_statut ON missions(statut)');
        await pool.query('CREATE INDEX idx_missions_division ON missions(division_id)');
        await pool.query('CREATE INDEX idx_missions_responsable ON missions(responsable_id)');
        await pool.query('CREATE INDEX idx_missions_dates ON missions(date_debut, date_fin_prevue)');
        await pool.query('CREATE INDEX idx_equipes_mission_mission ON equipes_mission(mission_id)');
        await pool.query('CREATE INDEX idx_equipes_mission_collaborateur ON equipes_mission(collaborateur_id)');
        await pool.query('CREATE INDEX idx_opportunites_client ON opportunites(client_id)');
        await pool.query('CREATE INDEX idx_opportunites_statut ON opportunites(statut)');
        await pool.query('CREATE INDEX idx_opportunites_collaborateur ON opportunites(collaborateur_id)');
        
        // Créer les triggers
        await pool.query(`
            CREATE OR REPLACE FUNCTION update_modified_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.date_modification = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql'
        `);
        
        await pool.query('CREATE TRIGGER update_clients_modification BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_modified_column()');
        await pool.query('CREATE TRIGGER update_missions_modification BEFORE UPDATE ON missions FOR EACH ROW EXECUTE FUNCTION update_modified_column()');
        await pool.query('CREATE TRIGGER update_equipes_mission_modification BEFORE UPDATE ON equipes_mission FOR EACH ROW EXECUTE FUNCTION update_modified_column()');
        await pool.query('CREATE TRIGGER update_opportunites_modification BEFORE UPDATE ON opportunites FOR EACH ROW EXECUTE FUNCTION update_modified_column()');
        
        // Insérer des données de test
        const insertClientsSQL = `
            INSERT INTO clients (nom, email, telephone, ville, secteur_activite, statut, source_prospection) VALUES
            ('Entreprise ABC', 'contact@abc.fr', '01 23 45 67 89', 'Paris', 'Technologie', 'client', 'recommandation'),
            ('Startup XYZ', 'hello@xyz.com', '04 56 78 90 12', 'Lyon', 'Finance', 'prospect', 'salon'),
            ('Groupe DEF', 'info@def.com', '02 34 56 78 90', 'Marseille', 'Industrie', 'client_fidele', 'web'),
            ('PME GHI', 'contact@ghi.fr', '03 45 67 89 01', 'Toulouse', 'Services', 'prospect', 'salon'),
            ('Corporation JKL', 'info@jkl.com', '05 67 89 01 23', 'Nantes', 'Logistique', 'client', 'recommandation')
        `;
        
        await pool.query(insertClientsSQL);
        
        console.log('✅ Tables de base créées avec succès');
        
        // Vérifier les tables créées
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('utilisateurs', 'divisions', 'clients', 'missions', 'equipes_mission', 'opportunites')
            ORDER BY table_name
        `);
        
        console.log('📋 Tables créées:', tables.rows.map(row => row.table_name));
        
        // Vérifier les données
        const clientCount = await pool.query('SELECT COUNT(*) as count FROM clients');
        console.log(`📊 Nombre de clients: ${clientCount.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Erreur lors de la création des tables de base:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

createBaseTables().catch(console.error); 