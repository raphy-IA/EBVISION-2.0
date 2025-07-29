-- Migration 021: Création de la table opportunity_stages
-- Date: 2025-07-21

CREATE TABLE IF NOT EXISTS opportunity_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    stage_name VARCHAR(100) NOT NULL,
    stage_order INTEGER NOT NULL DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_opportunity_stages_opportunity_id ON opportunity_stages(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_stages_stage_order ON opportunity_stages(stage_order);

-- Données par défaut pour les stages d'opportunité (ajoutées après la correction de structure)
-- Ces données seront ajoutées par la migration 023

-- Marquer cette migration comme exécutée
INSERT INTO migrations (filename, executed_at) 
VALUES ('021_create_opportunity_stages.sql', CURRENT_TIMESTAMP)
ON CONFLICT (filename) DO NOTHING; 