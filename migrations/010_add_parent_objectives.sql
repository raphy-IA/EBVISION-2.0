-- Migration 010: Ajouter support pour objectifs cascadés et autonomes
-- Ajoute parent_objective_id et is_cascaded pour tracer la hiérarchie

-- Business Unit Objectives
ALTER TABLE business_unit_objectives
ADD COLUMN parent_global_objective_id INTEGER REFERENCES global_objectives(id) ON DELETE SET NULL,
ADD COLUMN is_cascaded BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN business_unit_objectives.parent_global_objective_id IS 'ID de l''objectif global parent (si cascadé)';
COMMENT ON COLUMN business_unit_objectives.is_cascaded IS 'TRUE si distribué depuis un parent, FALSE si autonome';

-- Division Objectives
ALTER TABLE division_objectives
ADD COLUMN parent_bu_objective_id INTEGER REFERENCES business_unit_objectives(id) ON DELETE SET NULL,
ADD COLUMN is_cascaded BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN division_objectives.parent_bu_objective_id IS 'ID de l''objectif BU parent (si cascadé)';
COMMENT ON COLUMN division_objectives.is_cascaded IS 'TRUE si distribué depuis un parent, FALSE si autonome';

-- Individual Objectives
ALTER TABLE individual_objectives
ADD COLUMN parent_division_objective_id INTEGER REFERENCES division_objectives(id) ON DELETE SET NULL,
ADD COLUMN is_cascaded BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN individual_objectives.parent_division_objective_id IS 'ID de l''objectif Division parent (si cascadé)';
COMMENT ON COLUMN individual_objectives.is_cascaded IS 'TRUE si distribué depuis un parent, FALSE si autonome';

-- Index pour performance
CREATE INDEX idx_bu_objectives_parent ON business_unit_objectives(parent_global_objective_id);
CREATE INDEX idx_division_objectives_parent ON division_objectives(parent_bu_objective_id);
CREATE INDEX idx_individual_objectives_parent ON individual_objectives(parent_division_objective_id);
