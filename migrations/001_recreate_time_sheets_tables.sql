-- Migration pour recréer les tables time_sheets et time_entries
-- Suppression des anciennes tables et création des nouvelles avec la bonne structure

-- 1. Suppression des anciennes tables (si elles existent)
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS time_sheets CASCADE;

-- 2. Création de la table time_sheets (feuilles de temps)
CREATE TABLE time_sheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'sauvegardé' CHECK (statut IN ('sauvegardé', 'soumis', 'validé', 'rejeté')),
    notes_rejet TEXT,
    validateur_id UUID REFERENCES users(id) ON DELETE SET NULL,
    date_validation TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Contrainte unique pour éviter les doublons de feuilles de temps
    UNIQUE(user_id, week_start)
);

-- 3. Création de la table time_entries (entrées d'heures)
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    time_sheet_id UUID NOT NULL REFERENCES time_sheets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date_saisie DATE NOT NULL,
    heures NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (heures >= 0),
    type_heures VARCHAR(3) NOT NULL CHECK (type_heures IN ('HC', 'HNC')),
    statut VARCHAR(20) NOT NULL DEFAULT 'sauvegardé' CHECK (statut IN ('sauvegardé', 'soumis', 'validé', 'rejeté')),
    mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    internal_activity_id UUID REFERENCES internal_activities(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Contraintes de validation selon le type d'heures
    CONSTRAINT check_hc_requires_mission CHECK (
        (type_heures = 'HC' AND mission_id IS NOT NULL) OR 
        (type_heures = 'HNC' AND mission_id IS NULL)
    ),
    
    CONSTRAINT check_hc_requires_task CHECK (
        (type_heures = 'HC' AND task_id IS NOT NULL) OR 
        (type_heures = 'HNC' AND task_id IS NULL)
    ),
    
    CONSTRAINT check_hnc_requires_internal_activity CHECK (
        (type_heures = 'HNC' AND internal_activity_id IS NOT NULL) OR 
        (type_heures = 'HC' AND internal_activity_id IS NULL)
    ),
    
    -- Contrainte pour éviter les doublons d'entrées pour le même jour et type
    UNIQUE(time_sheet_id, date_saisie, type_heures, mission_id, task_id, internal_activity_id)
);

-- 4. Création des index pour optimiser les performances
CREATE INDEX idx_time_sheets_user_week ON time_sheets(user_id, week_start);
CREATE INDEX idx_time_sheets_statut ON time_sheets(statut);
CREATE INDEX idx_time_entries_time_sheet ON time_entries(time_sheet_id);
CREATE INDEX idx_time_entries_user_date ON time_entries(user_id, date_saisie);
CREATE INDEX idx_time_entries_type ON time_entries(type_heures);
CREATE INDEX idx_time_entries_mission ON time_entries(mission_id);
CREATE INDEX idx_time_entries_internal_activity ON time_entries(internal_activity_id);

-- 5. Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Triggers pour mettre à jour updated_at
CREATE TRIGGER update_time_sheets_updated_at 
    BEFORE UPDATE ON time_sheets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at 
    BEFORE UPDATE ON time_entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Fonction pour synchroniser le statut des entrées avec celui de la feuille de temps
CREATE OR REPLACE FUNCTION sync_time_entries_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour le statut de toutes les entrées de la feuille de temps
    UPDATE time_entries 
    SET statut = NEW.statut,
        updated_at = CURRENT_TIMESTAMP
    WHERE time_sheet_id = NEW.id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Trigger pour synchroniser automatiquement les statuts
CREATE TRIGGER sync_time_entries_status_trigger
    AFTER UPDATE OF statut ON time_sheets
    FOR EACH ROW EXECUTE FUNCTION sync_time_entries_status();

-- 9. Commentaires pour documenter les tables
COMMENT ON TABLE time_sheets IS 'Feuilles de temps hebdomadaires contenant des heures chargeables et non chargeables';
COMMENT ON TABLE time_entries IS 'Entrées d''heures individuelles (HC ou HNC) appartenant à une feuille de temps';
COMMENT ON COLUMN time_sheets.statut IS 'Statut de la feuille de temps: sauvegardé, soumis, validé, rejeté';
COMMENT ON COLUMN time_entries.type_heures IS 'Type d''heures: HC (Heures Chargeables) ou HNC (Heures Non Chargeables)';
COMMENT ON COLUMN time_entries.statut IS 'Statut de l''entrée d''heures, synchronisé avec la feuille de temps'; 