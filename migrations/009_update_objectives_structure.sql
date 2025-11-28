-- Ajout des colonnes pour le suivi automatique et le ciblage par grade

-- 1. Mise à jour de la table global_objectives
ALTER TABLE global_objectives 
ADD COLUMN IF NOT EXISTS tracking_type VARCHAR(20) DEFAULT 'MANUAL', -- 'MANUAL', 'AUTOMATIC'
ADD COLUMN IF NOT EXISTS metric_code VARCHAR(50); -- 'CAMPAIGNS_COUNT', 'REVENUE', etc.

-- 2. Mise à jour de la table business_unit_objectives
ALTER TABLE business_unit_objectives 
ADD COLUMN IF NOT EXISTS tracking_type VARCHAR(20) DEFAULT 'MANUAL',
ADD COLUMN IF NOT EXISTS metric_code VARCHAR(50);

-- 3. Mise à jour de la table division_objectives
ALTER TABLE division_objectives 
ADD COLUMN IF NOT EXISTS tracking_type VARCHAR(20) DEFAULT 'MANUAL',
ADD COLUMN IF NOT EXISTS metric_code VARCHAR(50);

-- 4. Mise à jour de la table individual_objectives
ALTER TABLE individual_objectives 
ADD COLUMN IF NOT EXISTS tracking_type VARCHAR(20) DEFAULT 'MANUAL',
ADD COLUMN IF NOT EXISTS metric_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS target_grade_id UUID REFERENCES grades(id); -- Pour savoir si assigné via un grade

-- 5. Création d'un index pour les performances
CREATE INDEX IF NOT EXISTS idx_objectives_metric_code ON global_objectives(metric_code);
