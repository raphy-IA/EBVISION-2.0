const { pool } = require('../src/utils/database');

async function createClientsTable() {
    try {
        console.log('🔧 Création de la table clients...');
        
        // Supprimer la table si elle existe
        await pool.query('DROP TABLE IF EXISTS clients CASCADE');
        
        // Créer la table clients avec la bonne structure
        const createTableSQL = `
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
        
        await pool.query(createTableSQL);
        
        // Créer les index
        await pool.query('CREATE INDEX idx_clients_statut ON clients(statut)');
        await pool.query('CREATE INDEX idx_clients_collaborateur ON clients(collaborateur_id)');
        await pool.query('CREATE INDEX idx_clients_date_creation ON clients(date_creation)');
        
        // Créer le trigger pour mettre à jour les dates de modification
        await pool.query(`
            CREATE OR REPLACE FUNCTION update_modified_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.date_modification = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql'
        `);
        
        await pool.query(`
            CREATE TRIGGER update_clients_modification 
                BEFORE UPDATE ON clients 
                FOR EACH ROW EXECUTE FUNCTION update_modified_column()
        `);
        
        // Insérer des données de test
        const insertDataSQL = `
            INSERT INTO clients (nom, email, telephone, ville, secteur_activite, statut, source_prospection) VALUES
            ('Entreprise ABC', 'contact@abc.fr', '01 23 45 67 89', 'Paris', 'Technologie', 'client', 'recommandation'),
            ('Startup XYZ', 'hello@xyz.com', '04 56 78 90 12', 'Lyon', 'Finance', 'prospect', 'salon'),
            ('Groupe DEF', 'info@def.com', '02 34 56 78 90', 'Marseille', 'Industrie', 'client_fidele', 'web'),
            ('PME GHI', 'contact@ghi.fr', '03 45 67 89 01', 'Toulouse', 'Services', 'prospect', 'salon'),
            ('Corporation JKL', 'info@jkl.com', '05 67 89 01 23', 'Nantes', 'Logistique', 'client', 'recommandation')
        `;
        
        await pool.query(insertDataSQL);
        
        console.log('✅ Table clients créée avec succès');
        
        // Vérifier la structure
        const columns = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'clients' 
            ORDER BY ordinal_position
        `);
        
        console.log('📋 Structure de la table clients:');
        columns.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
        });
        
        // Vérifier les données
        const count = await pool.query('SELECT COUNT(*) as count FROM clients');
        console.log(`📊 Nombre de clients: ${count.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Erreur lors de la création de la table clients:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

createClientsTable().catch(console.error); 