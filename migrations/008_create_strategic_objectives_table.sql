-- Création de la table des objectifs stratégiques
CREATE TABLE IF NOT EXISTS strategic_objectives (
    id SERIAL PRIMARY KEY,
    business_unit_id UUID REFERENCES business_units(id),
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    type VARCHAR(50) NOT NULL, -- 'CA', 'MARGE', 'SATISFACTION', 'CONVERSION', etc.
    target_value DECIMAL(15, 2) NOT NULL,
    unit VARCHAR(20) DEFAULT '', -- '€', '%', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(business_unit_id, year, type)
);

-- Insertion des données par défaut (basées sur les valeurs hardcodées actuelles)
-- Pour l'année 2024, sans BU spécifique (Global)
INSERT INTO strategic_objectives (year, type, target_value, unit)
VALUES 
    (2024, 'CA', 2500000, '€'),
    (2024, 'MARGE', 25, '%'),
    (2024, 'SATISFACTION', 95, '%'),
    (2024, 'CONVERSION', 80, '%')
ON CONFLICT (business_unit_id, year, type) DO NOTHING;
