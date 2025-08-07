-- Migration pour ajouter la colonne updated_at à la table time_sheets
ALTER TABLE time_sheets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Créer un trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS update_time_sheets_updated_at ON time_sheets;

-- Créer le trigger
CREATE TRIGGER update_time_sheets_updated_at 
    BEFORE UPDATE ON time_sheets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 