-- Migration 040: Ajout de la relation entre users et collaborateurs
-- Date: 2025-01-01
-- Description: Ajout de la relation user_id dans la table collaborateurs

-- =====================================================
-- 1. AJOUT DE LA COLONNE USER_ID DANS COLLABORATEURS
-- =====================================================
-- Ajouter la colonne user_id pour lier le collaborateur à son compte utilisateur
ALTER TABLE collaborateurs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Index pour la nouvelle colonne
CREATE INDEX IF NOT EXISTS idx_collaborateurs_user ON collaborateurs(user_id);

-- =====================================================
-- 2. AJOUT DE LA COLONNE COLLABORATEUR_ID DANS USERS
-- =====================================================
-- Ajouter la colonne collaborateur_id pour lier l'utilisateur à son profil collaborateur
ALTER TABLE users ADD COLUMN IF NOT EXISTS collaborateur_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL;

-- Index pour la nouvelle colonne
CREATE INDEX IF NOT EXISTS idx_users_collaborateur ON users(collaborateur_id);

-- =====================================================
-- 3. CONTRAINTES ET COMMENTAIRES
-- =====================================================
-- Contrainte pour s'assurer qu'un collaborateur ne peut avoir qu'un seul compte utilisateur
CREATE UNIQUE INDEX IF NOT EXISTS idx_collaborateurs_user_unique ON collaborateurs(user_id) WHERE user_id IS NOT NULL;

-- Contrainte pour s'assurer qu'un utilisateur ne peut être lié qu'à un seul collaborateur
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_collaborateur_unique ON users(collaborateur_id) WHERE collaborateur_id IS NOT NULL;

-- Commentaires
COMMENT ON COLUMN collaborateurs.user_id IS 'Reference vers le compte utilisateur du collaborateur (optionnel)';
COMMENT ON COLUMN users.collaborateur_id IS 'Reference vers le profil collaborateur de l utilisateur (optionnel)';

-- =====================================================
-- 4. MISE À JOUR DES TRIGGERS
-- =====================================================
-- Le trigger update_updated_at_column() existe déjà et sera appliqué automatiquement 