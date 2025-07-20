-- Migration 012: Refactorisation Business Units et Divisions
-- Date: 2025-07-19
-- Description: Renommer divisions en business_units et créer une nouvelle table divisions

-- 1. Renommer la table divisions en business_units
ALTER TABLE divisions RENAME TO business_units;

-- 2. Créer la nouvelle table divisions
CREATE TABLE divisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE,
    description TEXT,
    business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
    statut VARCHAR(20) NOT NULL DEFAULT 'ACTIF' CHECK (statut IN ('ACTIF', 'INACTIF')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Créer les index pour la nouvelle table divisions
CREATE INDEX idx_divisions_code ON divisions(code);
CREATE INDEX idx_divisions_statut ON divisions(statut);
CREATE INDEX idx_divisions_business_unit_id ON divisions(business_unit_id);

-- 4. Créer les triggers pour la nouvelle table divisions
CREATE TRIGGER update_divisions_updated_at BEFORE UPDATE ON divisions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Créer les index pour business_units (anciennement divisions)
CREATE INDEX idx_business_units_code ON business_units(code);
CREATE INDEX idx_business_units_statut ON business_units(statut);

-- 6. Créer les triggers pour business_units
CREATE TRIGGER update_business_units_updated_at BEFORE UPDATE ON business_units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 