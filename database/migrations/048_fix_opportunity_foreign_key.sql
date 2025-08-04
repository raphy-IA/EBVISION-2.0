-- Migration 048: Correction de la contrainte de clé étrangère opportunity_id
-- Date: 2025-08-03
-- Description: Corriger la référence de opportunity_id vers la table opportunites

-- 1. Supprimer l'ancienne contrainte
ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_opportunity_id_fkey;

-- 2. Ajouter la nouvelle contrainte avec la bonne table
ALTER TABLE missions ADD CONSTRAINT missions_opportunity_id_fkey 
    FOREIGN KEY (opportunity_id) REFERENCES opportunites(id) ON DELETE SET NULL; 