-- Create mission_documents table
CREATE TABLE IF NOT EXISTS mission_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES mission_documents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('folder', 'file')),
    file_path TEXT, -- Null for folders
    mime_type TEXT,
    size BIGINT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_mission_documents_mission_id ON mission_documents(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_documents_parent_id ON mission_documents(parent_id);

-- Trigger for updated_at
CREATE TRIGGER update_mission_documents_modtime
    BEFORE UPDATE ON mission_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
