-- Make division_id nullable in evolution_organisations table
ALTER TABLE evolution_organisations ALTER COLUMN division_id DROP NOT NULL;
