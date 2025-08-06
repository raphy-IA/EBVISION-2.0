-- Migration 061: Création de la table time_sheets
-- Cette table gère les feuilles de temps hebdomadaires avec validation

CREATE TABLE IF NOT EXISTS time_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaborateur_id UUID NOT NULL,
    date_debut_semaine DATE NOT NULL,
    date_fin_semaine DATE NOT NULL,
    annee INTEGER NOT NULL,
    semaine INTEGER NOT NULL,
    statut VARCHAR(20) DEFAULT 'draft' CHECK (statut IN ('draft', 'submitted', 'approved', 'rejected')),
    
    -- Validation
    validateur_id UUID,
    commentaire TEXT,
    date_soumission TIMESTAMP,
    date_validation TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contraintes de clés étrangères
    CONSTRAINT fk_time_sheets_collaborateur
        FOREIGN KEY (collaborateur_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_time_sheets_validateur
        FOREIGN KEY (validateur_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
    
    -- Contrainte d'unicité pour éviter les doublons
    CONSTRAINT unique_time_sheet_week
        UNIQUE (collaborateur_id, annee, semaine)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_time_sheets_collaborateur ON time_sheets(collaborateur_id);
CREATE INDEX IF NOT EXISTS idx_time_sheets_statut ON time_sheets(statut);
CREATE INDEX IF NOT EXISTS idx_time_sheets_semaine ON time_sheets(annee, semaine);
CREATE INDEX IF NOT EXISTS idx_time_sheets_dates ON time_sheets(date_debut_semaine, date_fin_semaine);
CREATE INDEX IF NOT EXISTS idx_time_sheets_validateur ON time_sheets(validateur_id);

-- Commentaires sur la table et les colonnes
COMMENT ON TABLE time_sheets IS 'Table des feuilles de temps hebdomadaires des utilisateurs';
COMMENT ON COLUMN time_sheets.id IS 'Identifiant unique de la feuille de temps';
COMMENT ON COLUMN time_sheets.collaborateur_id IS 'Identifiant du collaborateur propriétaire de la feuille';
COMMENT ON COLUMN time_sheets.date_debut_semaine IS 'Date de début de la semaine (lundi)';
COMMENT ON COLUMN time_sheets.date_fin_semaine IS 'Date de fin de la semaine (dimanche)';
COMMENT ON COLUMN time_sheets.annee IS 'Année de la feuille de temps';
COMMENT ON COLUMN time_sheets.semaine IS 'Numéro de semaine ISO (1-53)';
COMMENT ON COLUMN time_sheets.statut IS 'Statut de la feuille: draft, submitted, approved, rejected';
COMMENT ON COLUMN time_sheets.validateur_id IS 'Identifiant de l''utilisateur qui a validé la feuille';
COMMENT ON COLUMN time_sheets.commentaire IS 'Commentaires de validation';
COMMENT ON COLUMN time_sheets.date_soumission IS 'Date et heure de soumission';
COMMENT ON COLUMN time_sheets.date_validation IS 'Date et heure de validation';
COMMENT ON COLUMN time_sheets.created_at IS 'Date et heure de création';
COMMENT ON COLUMN time_sheets.updated_at IS 'Date et heure de dernière modification';

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_time_sheets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_time_sheets_updated_at
    BEFORE UPDATE ON time_sheets
    FOR EACH ROW
    EXECUTE FUNCTION update_time_sheets_updated_at(); 