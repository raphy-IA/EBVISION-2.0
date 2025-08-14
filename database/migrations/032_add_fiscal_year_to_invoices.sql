-- Migration: Ajouter fiscal_year_id à la table invoices
-- Date: 2025-08-14
-- Description: Liaison des factures avec les exercices fiscaux

-- 1) Ajouter la colonne fiscal_year_id
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS fiscal_year_id UUID REFERENCES fiscal_years(id) ON DELETE SET NULL;

-- 2) Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_invoices_fiscal_year ON invoices(fiscal_year_id);

-- 3) Rétro-remplissage depuis la mission liée
UPDATE invoices i
SET fiscal_year_id = m.fiscal_year_id
FROM missions m
WHERE i.mission_id = m.id
  AND i.fiscal_year_id IS NULL;

-- 4) Pour les factures restantes, utiliser l'exercice fiscal en cours
UPDATE invoices i
SET fiscal_year_id = (
    SELECT id FROM fiscal_years 
    WHERE statut = 'EN_COURS' 
    LIMIT 1
)
WHERE i.fiscal_year_id IS NULL;

-- 5) Commentaire sur la colonne
COMMENT ON COLUMN invoices.fiscal_year_id IS 'Exercice fiscal de la facture';


