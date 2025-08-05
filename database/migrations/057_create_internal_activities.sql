-- Migration 057: Création de la table internal_activities
-- Structure identique à task_templates mais pour les activités internes

CREATE TABLE IF NOT EXISTS internal_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_internal_activities_name ON internal_activities(name);
CREATE INDEX IF NOT EXISTS idx_internal_activities_active ON internal_activities(is_active);

-- Commentaires pour la documentation
COMMENT ON TABLE internal_activities IS 'Activités internes non liées aux missions';
COMMENT ON COLUMN internal_activities.name IS 'Nom de l''activité interne';
COMMENT ON COLUMN internal_activities.description IS 'Description détaillée de l''activité';
COMMENT ON COLUMN internal_activities.is_active IS 'Statut actif/inactif de l''activité'; 