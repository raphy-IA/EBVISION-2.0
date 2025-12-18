-- Migration: Add document paths to missions table
-- Created: 2025-12-18

DO $$ 
BEGIN 
    -- Add kyc_path column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'missions' AND column_name = 'kyc_path') THEN
        ALTER TABLE missions ADD COLUMN kyc_path TEXT;
    END IF;

    -- Add contract_path column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'missions' AND column_name = 'contract_path') THEN
        ALTER TABLE missions ADD COLUMN contract_path TEXT;
    END IF;

    -- Add validation to ensure paths are valid file paths (optional basic check)
    -- We can add a CHECK constraint later if needed, but for now simple text is enough
END $$;
