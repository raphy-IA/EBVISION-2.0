-- Migration pour ajouter les colonnes manquantes dans time_sheets

-- Ajouter les colonnes manquantes
ALTER TABLE time_sheets 
ADD COLUMN IF NOT EXISTS statut VARCHAR(20) NOT NULL DEFAULT 'sauvegardé' CHECK (statut IN ('sauvegardé', 'soumis', 'validé', 'rejeté')),
ADD COLUMN IF NOT EXISTS notes_rejet TEXT,
ADD COLUMN IF NOT EXISTS validateur_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS date_validation TIMESTAMP WITH TIME ZONE;

-- Ajouter la contrainte unique si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'time_sheets_user_week_unique'
    ) THEN
        ALTER TABLE time_sheets ADD CONSTRAINT time_sheets_user_week_unique UNIQUE(user_id, week_start);
    END IF;
END $$;

-- Vérifier et créer les index manquants
CREATE INDEX IF NOT EXISTS idx_time_sheets_user_week ON time_sheets(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_time_sheets_statut ON time_sheets(statut);
CREATE INDEX IF NOT EXISTS idx_time_entries_time_sheet ON time_entries(time_sheet_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON time_entries(user_id, date_saisie);
CREATE INDEX IF NOT EXISTS idx_time_entries_type ON time_entries(type_heures);
CREATE INDEX IF NOT EXISTS idx_time_entries_mission ON time_entries(mission_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_internal_activity ON time_entries(internal_activity_id);

-- Vérifier et créer les triggers
DO $$
BEGIN
    -- Trigger pour updated_at sur time_sheets
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_time_sheets_updated_at'
    ) THEN
        CREATE TRIGGER update_time_sheets_updated_at 
            BEFORE UPDATE ON time_sheets 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Trigger pour updated_at sur time_entries
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_time_entries_updated_at'
    ) THEN
        CREATE TRIGGER update_time_entries_updated_at 
            BEFORE UPDATE ON time_entries 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Trigger pour synchroniser les statuts
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'sync_time_entries_status_trigger'
    ) THEN
        CREATE TRIGGER sync_time_entries_status_trigger
            AFTER UPDATE OF statut ON time_sheets
            FOR EACH ROW EXECUTE FUNCTION sync_time_entries_status();
    END IF;
END $$; 