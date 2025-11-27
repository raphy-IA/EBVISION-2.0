ALTER TABLE postes
ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Mettre à jour les valeurs existantes pour actif si nécessaire
UPDATE postes SET actif = TRUE WHERE actif IS NULL;

-- Créer un trigger pour mettre à jour 'updated_at' automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_postes_updated_at
BEFORE UPDATE ON postes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
