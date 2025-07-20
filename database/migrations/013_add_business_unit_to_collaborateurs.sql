-- Migration 013: Ajout de business_unit_id à la table collaborateurs
-- Date: 2025-01-27
-- Description: Ajout de la relation obligatoire entre collaborateurs et business units

-- =====================================================
-- 1. MODIFICATION DE LA TABLE COLLABORATEURS
-- =====================================================
-- Ajouter la colonne business_unit_id (obligatoire)
ALTER TABLE collaborateurs ADD COLUMN IF NOT EXISTS business_unit_id UUID REFERENCES business_units(id) ON DELETE RESTRICT;

-- Index pour la nouvelle colonne
CREATE INDEX IF NOT EXISTS idx_collaborateurs_business_unit ON collaborateurs(business_unit_id);

-- =====================================================
-- 2. CONTRAINTE DE VALIDATION
-- =====================================================
-- Note: La validation que la division appartient à la business unit 
-- sera gérée au niveau de l'application

-- =====================================================
-- 3. COMMENTAIRES
-- =====================================================
COMMENT ON COLUMN collaborateurs.business_unit_id IS 'Business unit obligatoire du collaborateur';
COMMENT ON COLUMN collaborateurs.division_id IS 'Division optionnelle du collaborateur (doit appartenir à la business unit)'; 