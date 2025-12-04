-- Création de la table des taxes (Catalogue Global)
CREATE TABLE IF NOT EXISTS taxes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    rate DECIMAL(5,2) NOT NULL, -- Pourcentage (ex: 19.25)
    type VARCHAR(20) NOT NULL DEFAULT 'ADDED', -- 'ADDED' (Ajouté au net), 'WITHHOLDING' (Retenue à la source)
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertion des taxes par défaut
INSERT INTO taxes (name, rate, type, description) VALUES
('TVA', 19.25, 'ADDED', 'Taxe sur la Valeur Ajoutée'),
('IR 2.2%', 2.2, 'WITHHOLDING', 'Impôt sur le Revenu (Acompte)'),
('IR 5.5%', 5.5, 'WITHHOLDING', 'Impôt sur le Revenu (Taux plein)'),
('CSS', 1.0, 'ADDED', 'Contribution Spéciale')
ON CONFLICT DO NOTHING;

-- Création de la table des paramètres financiers par BU
CREATE TABLE IF NOT EXISTS bu_financial_settings (
    id SERIAL PRIMARY KEY,
    business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
    invoice_prefix VARCHAR(20),
    invoice_start_number INTEGER DEFAULT 1,
    invoice_footer TEXT, -- Mentions légales spécifiques
    invoice_template VARCHAR(20) DEFAULT 'FEES', -- 'FEES' (Honoraires/Débours), 'STANDARD' (Qté x Prix)
    active_tax_ids JSONB DEFAULT '[]'::jsonb, -- Liste des IDs de taxes applicables par défaut
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(business_unit_id)
);

-- Index pour la performance
CREATE INDEX IF NOT EXISTS idx_bu_financial_settings_bu_id ON bu_financial_settings(business_unit_id);
