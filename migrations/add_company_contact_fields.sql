-- Add contact and admin fields to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS contact_nom VARCHAR(255),
ADD COLUMN IF NOT EXISTS contact_tel VARCHAR(50),
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS admin_nom VARCHAR(255),
ADD COLUMN IF NOT EXISTS admin_contact VARCHAR(255),
ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255);

-- Log the change
DO $$
BEGIN
    RAISE NOTICE 'Added contact and admin columns to companies table';
END $$;
