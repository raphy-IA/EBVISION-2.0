-- Migration: Add contact fields to clients table

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS administrateur_nom VARCHAR(255),
ADD COLUMN IF NOT EXISTS administrateur_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS administrateur_telephone VARCHAR(50),
ADD COLUMN IF NOT EXISTS contact_interne_nom VARCHAR(255),
ADD COLUMN IF NOT EXISTS contact_interne_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS contact_interne_telephone VARCHAR(50);
