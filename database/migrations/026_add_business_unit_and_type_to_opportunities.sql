-- Migration 026: Ajout de la colonne business_unit_id à la table opportunities
-- Date: 2025-07-21

-- Note: La colonne opportunity_type_id a été retirée car elle dépend de la table opportunity_types
-- créée par la migration 024 que nous avons ignorée.

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

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_opportunities_business_unit_id ON opportunities(business_unit_id);
