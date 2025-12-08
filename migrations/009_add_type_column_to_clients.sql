-- Migration to add type column to clients table and separate it from statut

-- 1. Add new column 'type'
ALTER TABLE clients ADD COLUMN type VARCHAR(50);

-- 2. Migrate data
-- Determine 'type' based on old 'statut'
UPDATE clients SET type = 'PROSPECT' WHERE statut = 'PROSPECT';
UPDATE clients SET type = 'CLIENT' WHERE statut = 'CLIENT';
UPDATE clients SET type = 'CLIENT_FIDELE' WHERE statut = 'CLIENT_FIDELE';

-- For generic statuses, assume 'CLIENT' if unknown, or leave NULL to be filled later? 
-- Let's default 'ACTIF'/'INACTIF' entries to 'CLIENT' type if they don't have a type implied.
UPDATE clients SET type = 'CLIENT' WHERE statut IN ('ACTIF', 'INACTIF') AND type IS NULL;

-- 'ABANDONNE' is ambiguous. Could be Prospect or Client. Let's assume Prospect for now if not specified.
UPDATE clients SET type = 'PROSPECT' WHERE statut = 'ABANDONNE' AND type IS NULL;

-- 3. Update 'statut' to reflect Activity state
-- If it was PROSPECT/CLIENT/CLIENT_FIDELE, they are likely 'ACTIF'
UPDATE clients SET statut = 'ACTIF' WHERE statut IN ('PROSPECT', 'CLIENT', 'CLIENT_FIDELE');

-- 'ABANDONNE' can remain as a status 'ABANDONNE' or map to 'INACTIF'. 
-- Let's keep 'ABANDONNE' in statut if the user considers it a status.
-- Based on the user request, they want 'actif/inactif' separate from type. 
-- But 'Abandonné' is a valid status. So we keep it.

-- Ensure defaults
ALTER TABLE clients ALTER COLUMN statut SET DEFAULT 'ACTIF';
ALTER TABLE clients ALTER COLUMN type SET DEFAULT 'PROSPECT';
