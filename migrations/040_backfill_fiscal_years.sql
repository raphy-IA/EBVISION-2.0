-- Migration 040_backfill_fiscal_years
-- Description: Adds a fiscal_year_id to prospecting_campaigns and backfills fiscal_year_id on core elements based on creation/start dates.

-- 1. Add column to prospecting campaigns
ALTER TABLE prospecting_campaigns
ADD COLUMN IF NOT EXISTS fiscal_year_id UUID REFERENCES fiscal_years(id);

-- 2. Backfill Evaluation Campaigns based on start_date
UPDATE evaluation_campaigns ec
SET fiscal_year_id = (
    SELECT fy.id
    FROM fiscal_years fy
    WHERE ec.start_date >= fy.date_debut 
      AND ec.start_date <= fy.date_fin
    ORDER BY fy.date_debut DESC
    LIMIT 1
)
WHERE ec.fiscal_year_id IS NULL AND ec.start_date IS NOT NULL;

-- 3. Backfill Prospecting Campaigns based on created_at
UPDATE prospecting_campaigns pc
SET fiscal_year_id = (
    SELECT fy.id
    FROM fiscal_years fy
    WHERE pc.created_at::date >= fy.date_debut 
      AND pc.created_at::date <= fy.date_fin
    ORDER BY fy.date_debut DESC
    LIMIT 1
)
WHERE pc.fiscal_year_id IS NULL AND pc.created_at IS NOT NULL;

-- 4. Backfill Opportunities based on created_at
UPDATE opportunities o
SET fiscal_year_id = (
    SELECT fy.id
    FROM fiscal_years fy
    WHERE o.created_at::date >= fy.date_debut 
      AND o.created_at::date <= fy.date_fin
    ORDER BY fy.date_debut DESC
    LIMIT 1
)
WHERE o.fiscal_year_id IS NULL AND o.created_at IS NOT NULL;

-- 5. Backfill Missions based on date_debut
UPDATE missions m
SET fiscal_year_id = (
    SELECT fy.id
    FROM fiscal_years fy
    WHERE m.date_debut >= fy.date_debut 
      AND m.date_debut <= fy.date_fin
    ORDER BY fy.date_debut DESC
    LIMIT 1
)
WHERE m.fiscal_year_id IS NULL AND m.date_debut IS NOT NULL;

-- 6. Backfill Invoices based on date_emission
UPDATE invoices i
SET fiscal_year_id = (
    SELECT fy.id
    FROM fiscal_years fy
    WHERE i.date_emission >= fy.date_debut 
      AND i.date_emission <= fy.date_fin
    ORDER BY fy.date_debut DESC
    LIMIT 1
)
WHERE i.fiscal_year_id IS NULL AND i.date_emission IS NOT NULL;
