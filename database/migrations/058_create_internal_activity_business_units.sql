-- Migration 058: Création de la table de liaison internal_activity_business_units
-- Gère les affectations des activités internes aux business units

CREATE TABLE IF NOT EXISTS internal_activity_business_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internal_activity_id UUID NOT NULL,
    business_unit_id UUID NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contraintes de clés étrangères
    CONSTRAINT fk_internal_activity_business_units_activity 
        FOREIGN KEY (internal_activity_id) 
        REFERENCES internal_activities(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_internal_activity_business_units_business_unit 
        FOREIGN KEY (business_unit_id) 
        REFERENCES business_units(id) 
        ON DELETE CASCADE,
    
    -- Contrainte d'unicité pour éviter les doublons
    CONSTRAINT unique_internal_activity_business_unit 
        UNIQUE (internal_activity_id, business_unit_id)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_internal_activity_business_units_activity 
    ON internal_activity_business_units(internal_activity_id);
CREATE INDEX IF NOT EXISTS idx_internal_activity_business_units_business_unit 
    ON internal_activity_business_units(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_internal_activity_business_units_active 
    ON internal_activity_business_units(is_active);

-- Commentaires pour la documentation
COMMENT ON TABLE internal_activity_business_units IS 'Affectation des activités internes aux business units';
COMMENT ON COLUMN internal_activity_business_units.internal_activity_id IS 'ID de l''activité interne';
COMMENT ON COLUMN internal_activity_business_units.business_unit_id IS 'ID de la business unit';
COMMENT ON COLUMN internal_activity_business_units.is_active IS 'Statut actif/inactif de l''affectation'; 