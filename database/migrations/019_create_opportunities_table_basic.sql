-- Migration 019: Création de la table opportunities (version basique)
-- Date: 2025-07-20

-- Création de la table opportunities
CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    client_id UUID,
    collaborateur_id UUID,
    statut VARCHAR(50) NOT NULL DEFAULT 'NOUVELLE' CHECK (statut IN ('NOUVELLE', 'EN_COURS', 'GAGNEE', 'PERDUE', 'ANNULEE')),
    type_opportunite VARCHAR(100),
    source VARCHAR(100),
    probabilite INTEGER DEFAULT 0 CHECK (probabilite >= 0 AND probabilite <= 100),
    montant_estime DECIMAL(15,2),
    devise VARCHAR(5) DEFAULT 'FCFA',
    date_fermeture_prevue DATE,
    date_fermeture_reelle DATE,
    etape_vente VARCHAR(50) DEFAULT 'PROSPECTION' CHECK (etape_vente IN ('PROSPECTION', 'QUALIFICATION', 'PROPOSITION', 'NEGOCIATION', 'FERMETURE')),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_opportunities_client_id ON opportunities(client_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_collaborateur_id ON opportunities(collaborateur_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_statut ON opportunities(statut);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON opportunities(created_at);
CREATE INDEX IF NOT EXISTS idx_opportunities_date_fermeture_prevue ON opportunities(date_fermeture_prevue);

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_opportunities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_opportunities_updated_at
    BEFORE UPDATE ON opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_opportunities_updated_at(); 