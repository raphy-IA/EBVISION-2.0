-- Migration pour créer la table prospecting_campaign_validation_companies
-- Cette table stocke les validations individuelles par entreprise

CREATE TABLE IF NOT EXISTS prospecting_campaign_validation_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    validation_id UUID NOT NULL REFERENCES prospecting_campaign_validations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    validation VARCHAR(10) NOT NULL CHECK (validation IN ('OK', 'NOT_OK')),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Contrainte d'unicité pour éviter les doublons
    UNIQUE(validation_id, company_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_validation_companies_validation_id ON prospecting_campaign_validation_companies(validation_id);
CREATE INDEX IF NOT EXISTS idx_validation_companies_company_id ON prospecting_campaign_validation_companies(company_id);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_validation_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_validation_companies_updated_at
    BEFORE UPDATE ON prospecting_campaign_validation_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_validation_companies_updated_at();

-- Commentaire sur la table
COMMENT ON TABLE prospecting_campaign_validation_companies IS 'Table pour stocker les validations individuelles par entreprise dans une campagne de prospection';
COMMENT ON COLUMN prospecting_campaign_validation_companies.validation IS 'OK = Approuvée, NOT_OK = Rejetée';
COMMENT ON COLUMN prospecting_campaign_validation_companies.note IS 'Note optionnelle du validateur pour cette entreprise spécifique';
