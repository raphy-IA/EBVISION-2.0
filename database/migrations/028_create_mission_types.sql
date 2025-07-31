-- Migration 028: Création de la table des types de mission
-- Date: 2025-01-31
-- Description: Table pour gérer les types de mission avec codification et division

-- Table des types de mission
CREATE TABLE IF NOT EXISTS mission_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codification VARCHAR(20) NOT NULL UNIQUE,
    libelle VARCHAR(200) NOT NULL,
    description TEXT,
    division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
    actif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_mission_types_codification ON mission_types(codification);
CREATE INDEX IF NOT EXISTS idx_mission_types_division ON mission_types(division_id);
CREATE INDEX IF NOT EXISTS idx_mission_types_actif ON mission_types(actif);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_mission_types_modification 
    BEFORE UPDATE ON mission_types 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Insertion de données de test pour les types de mission
INSERT INTO mission_types (codification, libelle, description) VALUES
('AUDIT', 'Audit', 'Audit comptable et financier'),
('CONSEIL', 'Conseil', 'Conseil en gestion et stratégie'),
('FORMATION', 'Formation', 'Formation et développement des compétences'),
('DEV', 'Développement', 'Développement informatique et digital'),
('FISCAL', 'Fiscal', 'Conseil fiscal et optimisation'),
('JURIDIQUE', 'Juridique', 'Conseil juridique et légal'),
('RH', 'Ressources Humaines', 'Conseil en ressources humaines'),
('MARKETING', 'Marketing', 'Stratégie marketing et communication'),
('FINANCE', 'Finance', 'Gestion financière et trésorerie'),
('LOGISTIQUE', 'Logistique', 'Optimisation logistique et supply chain')
ON CONFLICT (codification) DO NOTHING; 