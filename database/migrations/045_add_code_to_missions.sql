-- Migration pour ajouter la colonne code à la table missions
-- Date: 2025-08-01

-- Ajouter la colonne code à la table missions
ALTER TABLE missions ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE;

-- Ajouter la colonne opportunity_id à la table missions
ALTER TABLE missions ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES opportunites(id) ON DELETE SET NULL;

-- Ajouter la colonne mission_type_id à la table missions
ALTER TABLE missions ADD COLUMN IF NOT EXISTS mission_type_id UUID REFERENCES mission_types(id) ON DELETE SET NULL;

-- Ajouter les colonnes financières à la table missions
ALTER TABLE missions ADD COLUMN IF NOT EXISTS montant_honoraires DECIMAL(12,2);
ALTER TABLE missions ADD COLUMN IF NOT EXISTS devise_honoraires VARCHAR(10) DEFAULT 'EUR';
ALTER TABLE missions ADD COLUMN IF NOT EXISTS description_honoraires TEXT;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS montant_debours DECIMAL(12,2);
ALTER TABLE missions ADD COLUMN IF NOT EXISTS devise_debours VARCHAR(10) DEFAULT 'EUR';
ALTER TABLE missions ADD COLUMN IF NOT EXISTS description_debours TEXT;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS conditions_paiement TEXT;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS pourcentage_avance DECIMAL(5,2) DEFAULT 0.00;

-- Créer l'index sur la colonne code si elle n'existe pas déjà
CREATE INDEX IF NOT EXISTS idx_missions_code ON missions(code);

-- Créer des index pour les nouvelles colonnes
CREATE INDEX IF NOT EXISTS idx_missions_opportunity_id ON missions(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_missions_mission_type_id ON missions(mission_type_id); 