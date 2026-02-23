-- Migration: Ensure Fiscal Year FY26 exists
-- Created: 2026-02-21
-- Description: Inserts FY26 into fiscal_years table if it doesn't already exist.

INSERT INTO fiscal_years (id, annee, date_debut, date_fin, statut, libelle)
SELECT 
    '9bb09c52-a16c-4c1a-ab68-0573a4bc9bf2', 
    2026, 
    '2025-12-31', 
    '2026-12-30', 
    'EN_COURS', 
    'FY26'
WHERE NOT EXISTS (
    SELECT 1 FROM fiscal_years WHERE libelle = 'FY26' OR annee = 2026
);
