-- Migration 041: Ajout de la colonne photo_url à la table collaborateurs
-- Date: 2025-08-28
-- Description: Ajout de la gestion des photos de profil pour les collaborateurs

-- =====================================================
-- 1. AJOUT DE LA COLONNE PHOTO_URL DANS COLLABORATEURS
-- =====================================================
-- Ajouter la colonne photo_url pour stocker le chemin vers la photo de profil
ALTER TABLE collaborateurs ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);

-- Index pour optimiser les recherches par photo
CREATE INDEX IF NOT EXISTS idx_collaborateurs_photo ON collaborateurs(photo_url) WHERE photo_url IS NOT NULL;

-- =====================================================
-- 2. COMMENTAIRES
-- =====================================================
COMMENT ON COLUMN collaborateurs.photo_url IS 'Chemin vers la photo de profil du collaborateur (optionnel)';
