-- Migration 059: Création de la table internal_activity_time_entries
-- Gère les saisies de temps sur les activités internes (heures non chargeables)

CREATE TABLE IF NOT EXISTS internal_activity_time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    internal_activity_id UUID NOT NULL,
    business_unit_id UUID NOT NULL,
    date DATE NOT NULL,
    hours DECIMAL(4,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
    description TEXT,
    is_approved BOOLEAN DEFAULT false,
    approved_by UUID,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contraintes de clés étrangères
    CONSTRAINT fk_internal_activity_time_entries_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_internal_activity_time_entries_activity 
        FOREIGN KEY (internal_activity_id) 
        REFERENCES internal_activities(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_internal_activity_time_entries_business_unit 
        FOREIGN KEY (business_unit_id) 
        REFERENCES business_units(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_internal_activity_time_entries_approved_by 
        FOREIGN KEY (approved_by) 
        REFERENCES users(id) 
        ON DELETE SET NULL,
    
    -- Contrainte d'unicité pour éviter les doublons sur la même journée
    CONSTRAINT unique_internal_activity_time_entry 
        UNIQUE (user_id, internal_activity_id, business_unit_id, date)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_internal_activity_time_entries_user 
    ON internal_activity_time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_internal_activity_time_entries_activity 
    ON internal_activity_time_entries(internal_activity_id);
CREATE INDEX IF NOT EXISTS idx_internal_activity_time_entries_business_unit 
    ON internal_activity_time_entries(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_internal_activity_time_entries_date 
    ON internal_activity_time_entries(date);
CREATE INDEX IF NOT EXISTS idx_internal_activity_time_entries_approved 
    ON internal_activity_time_entries(is_approved);

-- Commentaires pour la documentation
COMMENT ON TABLE internal_activity_time_entries IS 'Saisies de temps sur les activités internes (heures non chargeables)';
COMMENT ON COLUMN internal_activity_time_entries.user_id IS 'Utilisateur qui a saisi le temps';
COMMENT ON COLUMN internal_activity_time_entries.internal_activity_id IS 'Activité interne concernée';
COMMENT ON COLUMN internal_activity_time_entries.business_unit_id IS 'Business unit concernée';
COMMENT ON COLUMN internal_activity_time_entries.date IS 'Date de la saisie de temps';
COMMENT ON COLUMN internal_activity_time_entries.hours IS 'Nombre d''heures (non chargeables)';
COMMENT ON COLUMN internal_activity_time_entries.description IS 'Description du travail effectué';
COMMENT ON COLUMN internal_activity_time_entries.is_approved IS 'Statut d''approbation';
COMMENT ON COLUMN internal_activity_time_entries.approved_by IS 'Utilisateur qui a approuvé'; 