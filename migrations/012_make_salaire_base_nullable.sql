-- Migration: Make salaire_base column nullable in taux_horaires table
-- Date: 2025-12-03
-- Description: The salaire_base field is optional and should allow NULL values.
--              This fixes the 400 Bad Request error when creating taux horaires
--              without specifying salaire_base.

-- Make salaire_base nullable
ALTER TABLE taux_horaires 
ALTER COLUMN salaire_base DROP NOT NULL;

-- Add a comment to document this change
COMMENT ON COLUMN taux_horaires.salaire_base IS 'Salaire de base (optionnel) - peut être NULL si seul le taux horaire est défini';
