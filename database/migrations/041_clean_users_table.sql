-- Migration 041: Nettoyage de la table users
-- Date: 2025-01-01
-- Description: Suppression des anciennes colonnes de la table users

-- =====================================================
-- 1. SUPPRESSION DES ANCIENNES COLONNES
-- =====================================================
-- Supprimer les colonnes qui ne sont plus nécessaires
ALTER TABLE users DROP COLUMN IF EXISTS division_id;
ALTER TABLE users DROP COLUMN IF EXISTS date_embauche;
ALTER TABLE users DROP COLUMN IF EXISTS taux_horaire;

-- =====================================================
-- 2. MISE À JOUR DES CONTRAINTES
-- =====================================================
-- Supprimer les contraintes liées aux anciennes colonnes
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_division_id_fkey;

-- =====================================================
-- 3. COMMENTAIRES
-- =====================================================
COMMENT ON TABLE users IS 'Table des comptes utilisateurs pour l authentification';
COMMENT ON COLUMN users.id IS 'Identifiant unique de l utilisateur';
COMMENT ON COLUMN users.nom IS 'Nom de famille de l utilisateur';
COMMENT ON COLUMN users.prenom IS 'Prénom de l utilisateur';
COMMENT ON COLUMN users.email IS 'Adresse email unique de l utilisateur';
COMMENT ON COLUMN users.password_hash IS 'Hash du mot de passe';
COMMENT ON COLUMN users.initiales IS 'Initiales uniques de l utilisateur';
COMMENT ON COLUMN users.grade IS 'Grade de l utilisateur (ASSISTANT, SENIOR, MANAGER, DIRECTOR, PARTNER)';
COMMENT ON COLUMN users.statut IS 'Statut du compte (ACTIF, INACTIF, CONGE)';
COMMENT ON COLUMN users.collaborateur_id IS 'Reference vers le profil collaborateur (optionnel)';
COMMENT ON COLUMN users.last_login IS 'Date de dernière connexion';
COMMENT ON COLUMN users.created_at IS 'Date de creation du compte';
COMMENT ON COLUMN users.updated_at IS 'Date de derniere modification'; 