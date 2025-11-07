-- Migration 026: Ajout des colonnes business_unit_id et opportunity_type_id à la table opportunities
-- Date: 2025-07-21

-- Ajouter la colonne business_unit_id si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'opportunities' 
        AND column_name = 'business_unit_id'
    ) THEN
        ALTER TABLE opportunities ADD COLUMN business_unit_id UUID REFERENCES business_units(id);
    END IF;
END $$;

-- Ajouter la colonne opportunity_type_id si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'opportunities' 
        AND column_name = 'opportunity_type_id'
    ) THEN
        ALTER TABLE opportunities ADD COLUMN opportunity_type_id UUID REFERENCES opportunity_types(id);
    END IF;
END $$;

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_opportunities_business_unit_id ON opportunities(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_opportunity_type_id ON opportunities(opportunity_type_id);