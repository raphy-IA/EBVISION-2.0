-- Migration 023: Add manager_id to missions
-- Description: Adds a manager role distinct from the existing responsable (in-charge) and associe (partner)

ALTER TABLE missions 
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_missions_manager_id ON missions(manager_id);

-- Comment for clarity
COMMENT ON COLUMN missions.collaborateur_id IS 'In-Charge: executed the mission on the field (Responsable)';
COMMENT ON COLUMN missions.manager_id IS 'Manager: supervises the mission';
COMMENT ON COLUMN missions.associe_id IS 'Partner: accountable for the mission';
