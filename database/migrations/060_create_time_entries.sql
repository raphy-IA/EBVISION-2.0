-- Migration 060: Création de la table time_entries
-- Cette table gère les entrées de temps chargeables et non-chargeables

CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    hours DECIMAL(4,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
    business_unit_id UUID NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('chargeable', 'non-chargeable')),
    
    -- Champs pour les heures chargeables (missions/tâches)
    project_id UUID,
    task_id UUID,
    
    -- Champs pour les heures non-chargeables (activités internes)
    activity_id UUID,
    
    -- Statut de validation
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    approved_by UUID,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contraintes de clés étrangères
    CONSTRAINT fk_time_entries_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_time_entries_business_unit
        FOREIGN KEY (business_unit_id)
        REFERENCES business_units(id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_time_entries_project
        FOREIGN KEY (project_id)
        REFERENCES missions(id)
        ON DELETE SET NULL,
    
    CONSTRAINT fk_time_entries_task
        FOREIGN KEY (task_id)
        REFERENCES tasks(id)
        ON DELETE SET NULL,
    
    CONSTRAINT fk_time_entries_activity
        FOREIGN KEY (activity_id)
        REFERENCES internal_activities(id)
        ON DELETE SET NULL,
    
    CONSTRAINT fk_time_entries_approved_by
        FOREIGN KEY (approved_by)
        REFERENCES users(id)
        ON DELETE SET NULL,
    
    -- Contraintes de cohérence
    CONSTRAINT check_chargeable_fields
        CHECK (
            (type = 'chargeable' AND project_id IS NOT NULL AND task_id IS NOT NULL AND activity_id IS NULL) OR
            (type = 'non-chargeable' AND activity_id IS NOT NULL AND project_id IS NULL AND task_id IS NULL)
        ),
    
    -- Contrainte d'unicité pour éviter les doublons
    CONSTRAINT unique_time_entry
        UNIQUE (user_id, date, business_unit_id, type, COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::UUID), COALESCE(task_id, '00000000-0000-0000-0000-000000000000'::UUID), COALESCE(activity_id, '00000000-0000-0000-0000-000000000000'::UUID))
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON time_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_time_entries_business_unit ON time_entries(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_type ON time_entries(type);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_activity ON time_entries(activity_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_approved_by ON time_entries(approved_by);

-- Commentaires sur la table et les colonnes
COMMENT ON TABLE time_entries IS 'Table des entrées de temps des utilisateurs';
COMMENT ON COLUMN time_entries.id IS 'Identifiant unique de l''entrée de temps';
COMMENT ON COLUMN time_entries.user_id IS 'Identifiant de l''utilisateur qui a saisi le temps';
COMMENT ON COLUMN time_entries.date IS 'Date de l''entrée de temps';
COMMENT ON COLUMN time_entries.hours IS 'Nombre d''heures travaillées (entre 0.25 et 24)';
COMMENT ON COLUMN time_entries.business_unit_id IS 'Identifiant de la Business Unit concernée';
COMMENT ON COLUMN time_entries.description IS 'Description détaillée du travail effectué';
COMMENT ON COLUMN time_entries.type IS 'Type d''entrée: chargeable (mission) ou non-chargeable (activité interne)';
COMMENT ON COLUMN time_entries.project_id IS 'Identifiant du projet/mission (pour les heures chargeables)';
COMMENT ON COLUMN time_entries.task_id IS 'Identifiant de la tâche (pour les heures chargeables)';
COMMENT ON COLUMN time_entries.activity_id IS 'Identifiant de l''activité interne (pour les heures non-chargeables)';
COMMENT ON COLUMN time_entries.status IS 'Statut de validation: draft, submitted, approved, rejected';
COMMENT ON COLUMN time_entries.approved_by IS 'Identifiant de l''utilisateur qui a approuvé l''entrée';
COMMENT ON COLUMN time_entries.approved_at IS 'Date et heure d''approbation';
COMMENT ON COLUMN time_entries.rejection_reason IS 'Raison du rejet si applicable';
COMMENT ON COLUMN time_entries.created_at IS 'Date et heure de création';
COMMENT ON COLUMN time_entries.updated_at IS 'Date et heure de dernière modification';

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_time_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_time_entries_updated_at
    BEFORE UPDATE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_time_entries_updated_at(); 