-- Migration pour créer le système de suivi des étapes d'opportunité
-- 020_create_opportunity_stages.sql

-- Table des étapes d'opportunité
CREATE TABLE IF NOT EXISTS opportunity_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    stage_name VARCHAR(50) NOT NULL CHECK (stage_name IN ('PROSPECTION', 'QUALIFICATION', 'PROPOSITION', 'NEGOCIATION', 'FERMETURE', 'GAGNEE', 'PERDUE')),
    stage_order INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED')),
    start_date DATE,
    completion_date DATE,
    notes TEXT,
    documents JSONB DEFAULT '[]',
    validated_by UUID REFERENCES users(id),
    validated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des validations d'étapes
CREATE TABLE IF NOT EXISTS stage_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID NOT NULL REFERENCES opportunity_stages(id) ON DELETE CASCADE,
    validator_id UUID NOT NULL REFERENCES users(id),
    validation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validation_notes TEXT,
    required_documents JSONB DEFAULT '[]',
    provided_documents JSONB DEFAULT '[]',
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED', 'PENDING_CHANGES')),
    next_stage VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des documents d'étapes
CREATE TABLE IF NOT EXISTS stage_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID NOT NULL REFERENCES opportunity_stages(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(500),
    file_size INTEGER,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    is_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_opportunity_stages_opportunity_id ON opportunity_stages(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_stages_status ON opportunity_stages(status);
CREATE INDEX IF NOT EXISTS idx_stage_validations_stage_id ON stage_validations(stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_documents_stage_id ON stage_documents(stage_id);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_opportunity_stages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_opportunity_stages_updated_at
    BEFORE UPDATE ON opportunity_stages
    FOR EACH ROW
    EXECUTE FUNCTION update_opportunity_stages_updated_at();

-- Fonction pour créer automatiquement les étapes d'une opportunité
CREATE OR REPLACE FUNCTION create_opportunity_stages(opp_id UUID)
RETURNS VOID AS $$
DECLARE
    stage_record RECORD;
    stage_counter INTEGER := 1;
BEGIN
    -- Supprimer les étapes existantes si elles existent
    DELETE FROM opportunity_stages WHERE opportunity_id = opp_id;
    
    -- Créer les étapes par défaut
    FOR stage_record IN 
        SELECT unnest(ARRAY['PROSPECTION', 'QUALIFICATION', 'PROPOSITION', 'NEGOCIATION', 'FERMETURE']) AS stage_name
    LOOP
        INSERT INTO opportunity_stages (
            opportunity_id, 
            stage_name, 
            stage_order, 
            status,
            start_date
        ) VALUES (
            opp_id,
            stage_record.stage_name,
            stage_counter,
            CASE 
                WHEN stage_counter = 1 THEN 'IN_PROGRESS'
                ELSE 'PENDING'
            END,
            CASE 
                WHEN stage_counter = 1 THEN CURRENT_DATE
                ELSE NULL
            END
        );
        stage_counter := stage_counter + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour créer automatiquement les étapes lors de la création d'une opportunité
CREATE OR REPLACE FUNCTION trigger_create_opportunity_stages()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_opportunity_stages(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_opportunity_stages
    AFTER INSERT ON opportunities
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_opportunity_stages();

-- Données de test pour les étapes existantes
DO $$
DECLARE
    opp_record RECORD;
BEGIN
    FOR opp_record IN SELECT id FROM opportunities LOOP
        PERFORM create_opportunity_stages(opp_record.id);
    END LOOP;
END $$; 