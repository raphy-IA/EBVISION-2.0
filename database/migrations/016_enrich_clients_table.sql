-- Migration 016: Enrichissement de la table clients selon le CDC
-- Date: 2025-07-20
-- Description: Ajout des champs manquants pour une fiche client enrichie

-- Ajout des champs manquants à la table clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS numero_contribuable VARCHAR(20);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS forme_juridique VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS effectif INTEGER;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS chiffre_affaires DECIMAL(15,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS resultat_net DECIMAL(15,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notation VARCHAR(10); -- A, B, C, D, E
ALTER TABLE clients ADD COLUMN IF NOT EXISTS risque_client VARCHAR(20) DEFAULT 'faible'; -- faible, moyen, eleve, critique
ALTER TABLE clients ADD COLUMN IF NOT EXISTS groupe_id UUID REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS est_filiale BOOLEAN DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS site_web VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS date_creation_entreprise DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS secteur_geographique VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS classification_abc VARCHAR(1); -- A, B, C pour le scoring

-- Ajout de contraintes et index
CREATE INDEX IF NOT EXISTS idx_clients_contribuable ON clients(numero_contribuable);
CREATE INDEX IF NOT EXISTS idx_clients_groupe ON clients(groupe_id);
CREATE INDEX IF NOT EXISTS idx_clients_notation ON clients(notation);
CREATE INDEX IF NOT EXISTS idx_clients_risque ON clients(risque_client);
CREATE INDEX IF NOT EXISTS idx_clients_ca ON clients(chiffre_affaires);
CREATE INDEX IF NOT EXISTS idx_clients_effectif ON clients(effectif);

-- Contrainte pour numéro de contribuable unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_contribuable_unique ON clients(numero_contribuable) WHERE numero_contribuable IS NOT NULL;

-- Table pour les documents clients
CREATE TABLE IF NOT EXISTS documents_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    nom VARCHAR(255) NOT NULL,
    type_document VARCHAR(100) NOT NULL, -- KYC, contrat, attestation, correspondance, etc.
    chemin_fichier VARCHAR(500) NOT NULL,
    taille_fichier BIGINT,
    type_mime VARCHAR(100),
    description TEXT,
    date_upload TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table pour l'historique relationnel
CREATE TABLE IF NOT EXISTS historique_relationnel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    type_interaction VARCHAR(100) NOT NULL, -- appel, email, rdv, proposition, facturation, etc.
    description TEXT NOT NULL,
    date_interaction TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    collaborateur_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL,
    opportunite_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
    mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
    montant DECIMAL(12,2),
    statut VARCHAR(50), -- planifie, realise, annule, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Index pour les nouvelles tables
CREATE INDEX IF NOT EXISTS idx_documents_clients_client ON documents_clients(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_clients_type ON documents_clients(type_document);
CREATE INDEX IF NOT EXISTS idx_historique_relationnel_client ON historique_relationnel(client_id);
CREATE INDEX IF NOT EXISTS idx_historique_relationnel_date ON historique_relationnel(date_interaction);
CREATE INDEX IF NOT EXISTS idx_historique_relationnel_type ON historique_relationnel(type_interaction);

-- Triggers pour les nouvelles tables
DROP TRIGGER IF EXISTS update_documents_clients_updated_at ON documents_clients;
CREATE TRIGGER update_documents_clients_updated_at 
    BEFORE UPDATE ON documents_clients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour calculer automatiquement la notation client
CREATE OR REPLACE FUNCTION calculer_notation_client()
RETURNS TRIGGER AS $$
BEGIN
    -- Logique de notation basée sur CA en FCFA, effectif, risque, etc.
    IF NEW.chiffre_affaires > 100000000 THEN
        NEW.notation = 'A';
    ELSIF NEW.chiffre_affaires > 50000000 THEN
        NEW.notation = 'B';
    ELSIF NEW.chiffre_affaires > 10000000 THEN
        NEW.notation = 'C';
    ELSIF NEW.chiffre_affaires > 5000000 THEN
        NEW.notation = 'D';
    ELSE
        NEW.notation = 'E';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour calculer automatiquement la notation
DROP TRIGGER IF EXISTS trigger_calculer_notation_client ON clients;
CREATE TRIGGER trigger_calculer_notation_client
    BEFORE INSERT OR UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION calculer_notation_client();

-- Fonction pour calculer automatiquement le risque client
CREATE OR REPLACE FUNCTION calculer_risque_client()
RETURNS TRIGGER AS $$
BEGIN
    -- Logique de risque basée sur notation, CA, historique, etc.
    IF NEW.notation = 'A' OR NEW.notation = 'B' THEN
        NEW.risque_client = 'faible';
    ELSIF NEW.notation = 'C' THEN
        NEW.risque_client = 'moyen';
    ELSIF NEW.notation = 'D' THEN
        NEW.risque_client = 'eleve';
    ELSE
        NEW.risque_client = 'critique';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour calculer automatiquement le risque
DROP TRIGGER IF EXISTS trigger_calculer_risque_client ON clients;
CREATE TRIGGER trigger_calculer_risque_client
    BEFORE INSERT OR UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION calculer_risque_client();

-- Mise à jour des données existantes avec des valeurs par défaut
UPDATE clients SET 
    forme_juridique = 'SARL',
    effectif = 50,
    chiffre_affaires = 1000000.00,
    resultat_net = 100000.00,
    risque_client = 'moyen',
    secteur_geographique = 'Afrique de l''Ouest'
WHERE forme_juridique IS NULL;

-- Insertion de données de test pour les documents
-- (Commenté car ON CONFLICT nécessite une contrainte unique spécifique)
-- INSERT INTO documents_clients (client_id, nom, type_document, chemin_fichier, description)
-- SELECT 
--     c.id,
--     'KYC_' || c.nom || '.pdf',
--     'KYC',
--     '/documents/kyc/' || c.id || '.pdf',
--     'Document KYC pour ' || c.nom
-- FROM clients c
-- LIMIT 3;

-- Insertion de données de test pour l'historique
-- (Commenté car ON CONFLICT nécessite une contrainte unique spécifique)
-- INSERT INTO historique_relationnel (client_id, type_interaction, description, collaborateur_id)
-- SELECT 
--     c.id,
--     'premier_contact',
--     'Premier contact avec ' || c.nom,
--     c.collaborateur_id
-- FROM clients c
-- LIMIT 5; 