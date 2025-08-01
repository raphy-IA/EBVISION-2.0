-- Migration 042: Nettoyage final de la table users
-- Date: 2025-08-01
-- Description: Suppression de division_id, ajout de login, nettoyage des références

-- =====================================================
-- 1. SUPPRESSION DE LA COLONNE DIVISION_ID
-- =====================================================
-- Supprimer la colonne division_id de la table users
ALTER TABLE users DROP COLUMN IF EXISTS division_id;

-- Supprimer l'index associé
DROP INDEX IF EXISTS idx_users_division;

-- =====================================================
-- 2. AJOUT DE LA COLONNE LOGIN
-- =====================================================
-- Ajouter la colonne login pour permettre la connexion par login
ALTER TABLE users ADD COLUMN IF NOT EXISTS login VARCHAR(50) UNIQUE;

-- Index pour le login
CREATE INDEX IF NOT EXISTS idx_users_login ON users(login);

-- =====================================================
-- 3. NETTOYAGE DES RÉFÉRENCES DIVISION_ID
-- =====================================================
-- Supprimer la référence responsable_id de la table divisions
ALTER TABLE divisions DROP COLUMN IF EXISTS responsable_id;

-- =====================================================
-- 4. MISE À JOUR DES DONNÉES EXISTANTES
-- =====================================================
-- Générer des logins basés sur les initiales pour les utilisateurs existants
UPDATE users 
SET login = LOWER(initiales) 
WHERE login IS NULL;

-- =====================================================
-- 5. CONTRAINTES ET COMMENTAIRES
-- =====================================================
-- Commentaires
COMMENT ON COLUMN users.login IS 'Identifiant de connexion unique (en plus de l''email)';
COMMENT ON COLUMN users.collaborateur_id IS 'Reference vers le profil collaborateur de l utilisateur (optionnel)';

-- =====================================================
-- 6. MISE À JOUR DES TRIGGERS
-- =====================================================
-- Le trigger update_updated_at_column() existe déjà et sera appliqué automatiquement 