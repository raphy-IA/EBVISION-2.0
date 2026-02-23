-- Migration: Reconcile opportunities with missing fiscal_year_id
-- Created: 2026-02-21
-- Description: Links opportunities that have NULL fiscal_year_id to the appropriate fiscal year based on created_at date.

UPDATE opportunities o
SET fiscal_year_id = fy.id
FROM fiscal_years fy
WHERE o.fiscal_year_id IS NULL
AND o.created_at >= fy.date_debut
AND o.created_at <= fy.date_fin;

-- Si certaines opportunités n'ont toujours pas d'année fiscale (ex: créées avant la première FY définie)
-- On les lie à la première année fiscale par défaut pour éviter les orphelins dans les rapports
UPDATE opportunities
SET fiscal_year_id = (SELECT id FROM fiscal_years ORDER BY date_debut ASC LIMIT 1)
WHERE fiscal_year_id IS NULL;
