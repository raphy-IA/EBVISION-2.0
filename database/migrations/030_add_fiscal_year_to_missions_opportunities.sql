-- Migration: Ajouter fiscal_year_id aux tables missions et opportunities
-- Date: 2025-07-31
-- Description: Liaison des missions et opportunités avec les exercices fiscaux

-- Ajouter fiscal_year_id à la table missions
ALTER TABLE missions 
ADD COLUMN fiscal_year_id UUID REFERENCES fiscal_years(id) ON DELETE SET NULL;

-- Ajouter fiscal_year_id à la table opportunities
ALTER TABLE opportunities 
ADD COLUMN fiscal_year_id UUID REFERENCES fiscal_years(id) ON DELETE SET NULL;

-- Créer des index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_missions_fiscal_year ON missions(fiscal_year_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_fiscal_year ON opportunities(fiscal_year_id);

-- Pas de contrainte complexe pour éviter les problèmes de compatibilité

-- Mettre à jour les missions existantes avec l'exercice fiscal actuel
UPDATE missions 
SET fiscal_year_id = (
    SELECT id FROM fiscal_years 
    WHERE statut = 'EN_COURS' 
    LIMIT 1
)
WHERE fiscal_year_id IS NULL;

-- Mettre à jour les opportunités existantes avec l'exercice fiscal actuel
UPDATE opportunities 
SET fiscal_year_id = (
    SELECT id FROM fiscal_years 
    WHERE statut = 'EN_COURS' 
    LIMIT 1
)
WHERE fiscal_year_id IS NULL;

-- Commentaire sur les tables
COMMENT ON COLUMN missions.fiscal_year_id IS 'Exercice fiscal de la mission';
COMMENT ON COLUMN opportunities.fiscal_year_id IS 'Exercice fiscal de l''opportunité'; 