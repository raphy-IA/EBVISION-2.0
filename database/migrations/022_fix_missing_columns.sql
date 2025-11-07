-- Migration 022: Correction des colonnes manquantes
-- Date: 2025-07-21

-- Ajouter les colonnes manquantes dans la table clients
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Ajouter les colonnes manquantes dans la table missions
ALTER TABLE missions 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Mettre à jour les colonnes existantes si elles sont NULL
UPDATE clients SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
UPDATE clients SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;
UPDATE missions SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
UPDATE missions SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;