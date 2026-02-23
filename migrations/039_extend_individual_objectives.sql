-- Migration 039: Étendre la table individual_objectives pour supporter les objectifs autonomes
-- Ajout des colonnes nécessaires pour les objectifs créés hors distribution hiérarchique

ALTER TABLE individual_objectives 
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS objective_type_id INTEGER REFERENCES objective_types(id),
ADD COLUMN IF NOT EXISTS objective_mode VARCHAR(50) DEFAULT 'QUANTITATIVE',
ADD COLUMN IF NOT EXISTS metric_id INTEGER REFERENCES objective_metrics(id),
ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES objective_units(id);

COMMENT ON COLUMN individual_objectives.title IS 'Titre de l''objectif (pour les objectifs autonomes)';
COMMENT ON COLUMN individual_objectives.objective_mode IS 'Mode de l''objectif (QUANTITATIVE, QUALITATIVE)';
COMMENT ON COLUMN individual_objectives.target_grade_id IS 'ID du grade cible si l''objectif a été créé via une assignation par grade';
