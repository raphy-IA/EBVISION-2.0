-- Migration 043: Simplification de la table users
-- Date: 2025-08-01
-- Description: Simplification du modèle User avec seulement login, mot de passe, nom, prénom, email, rôle

-- =====================================================
-- 1. SUPPRESSION DES COLONNES NON NÉCESSAIRES
-- =====================================================
-- Supprimer les colonnes qui ne sont plus nécessaires
ALTER TABLE users DROP COLUMN IF EXISTS initiales;
ALTER TABLE users DROP COLUMN IF EXISTS grade;
ALTER TABLE users DROP COLUMN IF EXISTS collaborateur_id;

-- Supprimer les index associés
DROP INDEX IF EXISTS users_initiales_unique;
DROP INDEX IF EXISTS idx_users_collaborateur;
DROP INDEX IF EXISTS idx_users_collaborateur_unique;

-- =====================================================
-- 2. AJOUT DE LA COLONNE ROLE
-- =====================================================
-- Ajouter la colonne role pour remplacer grade
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'USER';

-- Index pour le role
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Contrainte pour les valeurs de role
ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('ADMIN', 'MANAGER', 'USER', 'ASSISTANT', 'SENIOR', 'DIRECTOR', 'PARTNER'));

-- =====================================================
-- 3. MISE À JOUR DES DONNÉES EXISTANTES
-- =====================================================
-- Convertir les grades existants en rôles
UPDATE users SET role = 'ADMIN' WHERE role = 'USER' AND email = 'admin@trs.com';
UPDATE users SET role = 'MANAGER' WHERE role = 'USER' AND email LIKE '%@trs.com';

-- =====================================================
-- 4. COMMENTAIRES
-- =====================================================
COMMENT ON COLUMN users.login IS 'Identifiant de connexion unique';
COMMENT ON COLUMN users.role IS 'Rôle/profil de l''utilisateur (ADMIN, MANAGER, USER, etc.)';

-- =====================================================
-- 5. VÉRIFICATION
-- =====================================================
-- Vérifier que la table a la bonne structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position; 