-- Migration 063: Système de responsables BU/Division pour validation campagnes
-- Date: 2025-08-14
-- Description: Ajout des responsables BU et Division pour workflow de validation

-- =====================================================
-- 1. AJOUTER LES RESPONSABLES BUSINESS UNIT
-- =====================================================
ALTER TABLE business_units ADD COLUMN IF NOT EXISTS responsable_principal_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL;
ALTER TABLE business_units ADD COLUMN IF NOT EXISTS responsable_adjoint_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL;

-- Index pour les responsables BU
CREATE INDEX IF NOT EXISTS idx_business_units_responsable_principal ON business_units(responsable_principal_id);
CREATE INDEX IF NOT EXISTS idx_business_units_responsable_adjoint ON business_units(responsable_adjoint_id);

-- =====================================================
-- 2. AJOUTER LES RESPONSABLES DIVISION
-- =====================================================
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS responsable_principal_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL;
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS responsable_adjoint_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL;

-- Index pour les responsables Division
CREATE INDEX IF NOT EXISTS idx_divisions_responsable_principal ON divisions(responsable_principal_id);
CREATE INDEX IF NOT EXISTS idx_divisions_responsable_adjoint ON divisions(responsable_adjoint_id);

-- =====================================================
-- 3. TABLE VALIDATIONS CAMPAGNES PROSPECTION
-- =====================================================
CREATE TABLE IF NOT EXISTS prospecting_campaign_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES prospecting_campaigns(id) ON DELETE CASCADE,
    demandeur_id UUID NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
    validateur_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL,
    niveau_validation VARCHAR(20) NOT NULL CHECK (niveau_validation IN ('DIVISION', 'BUSINESS_UNIT')),
    statut_validation VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE' CHECK (statut_validation IN ('EN_ATTENTE', 'APPROUVE', 'REFUSE', 'EXPIRE')),
    date_demande TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_validation TIMESTAMP WITH TIME ZONE,
    commentaire_demandeur TEXT,
    commentaire_validateur TEXT,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les validations
CREATE INDEX idx_campaign_validations_campaign ON prospecting_campaign_validations(campaign_id);
CREATE INDEX idx_campaign_validations_demandeur ON prospecting_campaign_validations(demandeur_id);
CREATE INDEX idx_campaign_validations_validateur ON prospecting_campaign_validations(validateur_id);
CREATE INDEX idx_campaign_validations_statut ON prospecting_campaign_validations(statut_validation);
CREATE INDEX idx_campaign_validations_niveau ON prospecting_campaign_validations(niveau_validation);

-- Trigger pour updated_at
CREATE TRIGGER update_campaign_validations_updated_at 
    BEFORE UPDATE ON prospecting_campaign_validations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. AJOUTER STATUT VALIDATION AUX CAMPAGNES
-- =====================================================
-- Ajouter colonnes de validation à la table des campagnes
ALTER TABLE prospecting_campaigns ADD COLUMN IF NOT EXISTS validation_statut VARCHAR(20) DEFAULT 'BROUILLON' CHECK (validation_statut IN ('BROUILLON', 'EN_VALIDATION', 'VALIDE', 'REJETE'));
ALTER TABLE prospecting_campaigns ADD COLUMN IF NOT EXISTS date_soumission TIMESTAMP WITH TIME ZONE;
ALTER TABLE prospecting_campaigns ADD COLUMN IF NOT EXISTS date_validation TIMESTAMP WITH TIME ZONE;

-- Index pour les statuts de validation
CREATE INDEX IF NOT EXISTS idx_campaigns_validation_statut ON prospecting_campaigns(validation_statut);

-- =====================================================
-- 5. COMMENTAIRES
-- =====================================================
COMMENT ON COLUMN business_units.responsable_principal_id IS 'Responsable principal de la BU (validation obligatoire)';
COMMENT ON COLUMN business_units.responsable_adjoint_id IS 'Responsable adjoint de la BU (validation alternative)';
COMMENT ON COLUMN divisions.responsable_principal_id IS 'Responsable principal de la division (validation obligatoire)';
COMMENT ON COLUMN divisions.responsable_adjoint_id IS 'Responsable adjoint de la division (validation alternative)';

COMMENT ON TABLE prospecting_campaign_validations IS 'Workflow de validation hiérarchique des campagnes de prospection';
COMMENT ON COLUMN prospecting_campaign_validations.niveau_validation IS 'Niveau de validation: DIVISION (responsable division) ou BUSINESS_UNIT (responsable BU)';
COMMENT ON COLUMN prospecting_campaign_validations.expires_at IS 'Date d expiration de la demande de validation (7 jours par défaut)';

COMMENT ON COLUMN prospecting_campaigns.validation_statut IS 'Statut de validation: BROUILLON, EN_VALIDATION, VALIDE, REJETE';




