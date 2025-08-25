-- Migration 004: Ajouter la colonne sigle à la table companies
-- Date: 2025-08-25

-- Ajouter la colonne sigle à la table companies
ALTER TABLE companies 
ADD COLUMN sigle VARCHAR(50);

-- Créer un index pour améliorer les performances de recherche sur le sigle
CREATE INDEX IF NOT EXISTS idx_companies_sigle 
ON companies (sigle) 
WHERE sigle IS NOT NULL;

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN companies.sigle IS 'Sigle ou acronyme de l''entreprise (ex: EDF, SNCF, etc.)';
