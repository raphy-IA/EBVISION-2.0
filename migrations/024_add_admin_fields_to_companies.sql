-- Add optional admin fields to companies table
ALTER TABLE companies
ADD COLUMN admin_name VARCHAR(255),
ADD COLUMN admin_phone VARCHAR(50),
ADD COLUMN admin_email VARCHAR(255);

COMMENT ON COLUMN companies.admin_name IS 'Nom de l''administrateur client';
COMMENT ON COLUMN companies.admin_phone IS 'Téléphone de l''administrateur client';
COMMENT ON COLUMN companies.admin_email IS 'Email de l''administrateur client';
