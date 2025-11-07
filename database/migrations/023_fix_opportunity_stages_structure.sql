-- Migration 023: Correction de la structure de la table opportunity_stages
-- Date: 2025-07-21

-- Ajouter la colonne is_completed si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'opportunity_stages' 
        AND column_name = 'is_completed'
    ) THEN
        ALTER TABLE opportunity_stages ADD COLUMN is_completed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Ajouter la colonne completed_at si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'opportunity_stages' 
        AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE opportunity_stages ADD COLUMN completed_at TIMESTAMP;
    END IF;
END $$;

-- Mettre à jour les données existantes pour mapper status vers is_completed
UPDATE opportunity_stages 
SET is_completed = CASE 
    WHEN status = 'COMPLETED' THEN TRUE 
    ELSE FALSE 
END,
completed_at = CASE 
    WHEN status = 'COMPLETED' THEN completion_date 
    ELSE NULL 
END;