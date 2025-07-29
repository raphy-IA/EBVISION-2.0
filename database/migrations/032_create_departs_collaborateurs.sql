-- Migration pour créer la table departs_collaborateurs
-- Date: 2025-07-29

-- Créer la table departs_collaborateurs
CREATE TABLE IF NOT EXISTS departs_collaborateurs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collaborateur_id UUID NOT NULL,
    type_depart VARCHAR(50) NOT NULL,
    date_effet DATE NOT NULL,
    motif TEXT NOT NULL,
    preavis INTEGER,
    documentation TEXT,
    remarques TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contraintes
    CONSTRAINT fk_depart_collaborateur 
        FOREIGN KEY (collaborateur_id) 
        REFERENCES collaborateurs(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT check_type_depart 
        CHECK (type_depart IN ('DEMISSION', 'LICENCIEMENT', 'ABANDON', 'RETRAITE', 'FIN_CONTRAT', 'MUTATION', 'AUTRE')),
    
    CONSTRAINT check_preavis_positive 
        CHECK (preavis IS NULL OR preavis >= 0)
);

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_depart_collaborateur_id ON departs_collaborateurs(collaborateur_id);
CREATE INDEX IF NOT EXISTS idx_depart_date_effet ON departs_collaborateurs(date_effet);
CREATE INDEX IF NOT EXISTS idx_depart_type ON departs_collaborateurs(type_depart);

-- Créer un trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_depart_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_depart_updated_at
    BEFORE UPDATE ON departs_collaborateurs
    FOR EACH ROW
    EXECUTE FUNCTION update_depart_updated_at();

-- Commentaires
COMMENT ON TABLE departs_collaborateurs IS 'Table pour gérer les départs des collaborateurs';
COMMENT ON COLUMN departs_collaborateurs.type_depart IS 'Type de départ (DEMISSION, LICENCIEMENT, etc.)';
COMMENT ON COLUMN departs_collaborateurs.date_effet IS 'Date de prise d''effet du départ';
COMMENT ON COLUMN departs_collaborateurs.motif IS 'Motif détaillé du départ';
COMMENT ON COLUMN departs_collaborateurs.preavis IS 'Nombre de jours de préavis respecté';
COMMENT ON COLUMN departs_collaborateurs.documentation IS 'Documents remis lors du départ';
COMMENT ON COLUMN departs_collaborateurs.remarques IS 'Remarques additionnelles';