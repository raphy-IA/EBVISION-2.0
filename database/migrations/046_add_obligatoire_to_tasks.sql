-- Migration pour ajouter la colonne obligatoire à la table tasks
-- Date: 2025-08-01

-- Ajouter la colonne obligatoire à la table tasks si elle n'existe pas
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS obligatoire BOOLEAN DEFAULT false;

-- Mettre à jour les tâches existantes pour marquer certaines comme obligatoires
UPDATE tasks SET obligatoire = true WHERE code IN ('ANALYSE', 'RAPPORT', 'VALIDATION'); 