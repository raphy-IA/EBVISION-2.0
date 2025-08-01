-- Migration: Ajouter libelle à la table fiscal_years
-- Date: 2025-07-31
-- Description: Ajout d'un libellé pour les années fiscales (ex: FY25)

-- Ajouter le champ libelle
ALTER TABLE fiscal_years 
ADD COLUMN libelle VARCHAR(50);

-- Mettre à jour les années fiscales existantes avec des libellés par défaut
UPDATE fiscal_years 
SET libelle = 'FY' || annee::text
WHERE libelle IS NULL;

-- Rendre le champ obligatoire après la mise à jour
ALTER TABLE fiscal_years 
ALTER COLUMN libelle SET NOT NULL;

-- Ajouter un index pour optimiser les recherches par libellé
CREATE INDEX IF NOT EXISTS idx_fiscal_years_libelle ON fiscal_years(libelle);

-- Commentaire sur la colonne
COMMENT ON COLUMN fiscal_years.libelle IS 'Libellé de l''année fiscale (ex: FY25)'; 