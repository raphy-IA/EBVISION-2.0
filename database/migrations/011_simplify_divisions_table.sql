-- Migration 011: Simplification de la table divisions
-- Date: 2025-07-19
-- Description: Suppression des champs budget_annuel et responsable_id, ajout du champ description

-- Supprimer la colonne budget_annuel
ALTER TABLE divisions DROP COLUMN IF EXISTS budget_annuel;

-- Supprimer la colonne responsable_id et sa contrainte de clé étrangère
ALTER TABLE divisions DROP COLUMN IF EXISTS responsable_id;

-- Ajouter la colonne description
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS description TEXT;

-- Mettre à jour la table pour avoir la structure simplifiée
-- Structure finale: id, nom, code, description, statut, created_at, updated_at 