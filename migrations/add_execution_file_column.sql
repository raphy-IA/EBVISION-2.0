-- Migration pour ajouter la colonne execution_file à la table prospecting_campaign_companies
-- Date: 2024-08-24

-- Ajouter la colonne execution_file
ALTER TABLE prospecting_campaign_companies 
ADD COLUMN IF NOT EXISTS execution_file VARCHAR(255);

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN prospecting_campaign_companies.execution_file IS 'Nom du fichier de preuve d''exécution (décharge, capture d''écran, etc.)';

-- Créer un index pour optimiser les recherches par fichier
CREATE INDEX IF NOT EXISTS idx_prospecting_campaign_companies_execution_file 
ON prospecting_campaign_companies(execution_file);
