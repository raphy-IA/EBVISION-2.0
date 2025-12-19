ALTER TABLE mission_documents ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

-- Update existing default folders/files to be locked if needed (optional for now as we will regenerate or manually update)
-- For now, just adding the column.
