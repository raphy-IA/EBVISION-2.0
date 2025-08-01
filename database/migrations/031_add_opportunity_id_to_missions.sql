-- Migration 031: Ajouter opportunity_id à la table missions
-- Date: 2025-08-01
-- Description: Ajouter une référence vers l'opportunité gagnée qui a généré cette mission

-- Ajouter la colonne opportunity_id à la table missions
ALTER TABLE missions 
ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL;

-- Créer un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_missions_opportunity_id ON missions(opportunity_id);

-- Ajouter une contrainte pour éviter les doublons (une opportunité ne peut générer qu'une seule mission)
CREATE UNIQUE INDEX IF NOT EXISTS idx_missions_opportunity_unique 
ON missions(opportunity_id) 
WHERE opportunity_id IS NOT NULL;

-- Commentaire pour documenter la relation
COMMENT ON COLUMN missions.opportunity_id IS 'Référence vers l''opportunité gagnée qui a généré cette mission. NULL si la mission a été créée manuellement.'; 