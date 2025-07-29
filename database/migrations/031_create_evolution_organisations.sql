-- Migration pour créer la table evolution_organisations
-- Cette table gère l'historique des changements organisationnels des collaborateurs

CREATE TABLE IF NOT EXISTS evolution_organisations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collaborateur_id UUID NOT NULL,
    business_unit_id UUID NOT NULL,
    division_id UUID NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NULL,
    motif TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contraintes de clés étrangères
    CONSTRAINT fk_evolution_organisations_collaborateur 
        FOREIGN KEY (collaborateur_id) REFERENCES collaborateurs(id) ON DELETE CASCADE,
    CONSTRAINT fk_evolution_organisations_business_unit 
        FOREIGN KEY (business_unit_id) REFERENCES business_units(id) ON DELETE RESTRICT,
    CONSTRAINT fk_evolution_organisations_division 
        FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE RESTRICT,
    
    -- Contraintes de validation
    CONSTRAINT check_evolution_organisations_dates 
        CHECK (date_debut <= COALESCE(date_fin, date_debut))
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_evolution_organisations_collaborateur 
    ON evolution_organisations(collaborateur_id);
CREATE INDEX IF NOT EXISTS idx_evolution_organisations_dates 
    ON evolution_organisations(date_debut, date_fin);
CREATE INDEX IF NOT EXISTS idx_evolution_organisations_business_unit 
    ON evolution_organisations(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_evolution_organisations_division 
    ON evolution_organisations(division_id);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_evolution_organisations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_evolution_organisations_updated_at
    BEFORE UPDATE ON evolution_organisations
    FOR EACH ROW
    EXECUTE FUNCTION update_evolution_organisations_updated_at();

-- Commentaires sur la table
COMMENT ON TABLE evolution_organisations IS 'Historique des évolutions organisationnelles des collaborateurs (Business Unit et Division)';
COMMENT ON COLUMN evolution_organisations.id IS 'Identifiant unique de l''évolution organisationnelle';
COMMENT ON COLUMN evolution_organisations.collaborateur_id IS 'Référence vers le collaborateur concerné';
COMMENT ON COLUMN evolution_organisations.business_unit_id IS 'Référence vers la Business Unit assignée';
COMMENT ON COLUMN evolution_organisations.division_id IS 'Référence vers la Division assignée';
COMMENT ON COLUMN evolution_organisations.date_debut IS 'Date de début de l''affectation organisationnelle';
COMMENT ON COLUMN evolution_organisations.date_fin IS 'Date de fin de l''affectation organisationnelle (NULL si en cours)';
COMMENT ON COLUMN evolution_organisations.motif IS 'Motif du changement organisationnel';
COMMENT ON COLUMN evolution_organisations.created_at IS 'Date de création de l''enregistrement';
COMMENT ON COLUMN evolution_organisations.updated_at IS 'Date de dernière modification de l''enregistrement';