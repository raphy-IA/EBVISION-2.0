-- Migration 049: Correction de la contrainte de clé étrangère associe_id
-- Date: 2025-08-03
-- Description: Corriger la référence de associe_id vers la table collaborateurs

-- 1. Supprimer l'ancienne contrainte
ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_associe_id_fkey;

-- 2. Ajouter la nouvelle contrainte avec la bonne table
ALTER TABLE missions ADD CONSTRAINT missions_associe_id_fkey 
    FOREIGN KEY (associe_id) REFERENCES collaborateurs(id) ON DELETE SET NULL; 