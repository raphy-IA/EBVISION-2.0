-- Migration 029: Add code and raison_sociale to clients table and update statut constraint
-- Date: 2025-07-29

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS raison_sociale VARCHAR(200) NOT NULL DEFAULT 'N/A';

-- Update statut column to allow new values
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_statut_check;
ALTER TABLE clients ADD CONSTRAINT clients_statut_check CHECK (statut IN ('PROSPECT', 'CLIENT', 'CLIENT_FIDELE', 'ACTIF', 'INACTIF', 'ABANDONNE'));

-- Set default value for existing rows where raison_sociale is null
UPDATE clients SET raison_sociale = 'N/A' WHERE raison_sociale IS NULL;
