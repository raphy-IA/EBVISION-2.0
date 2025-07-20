-- Migration 015: Correction de la table postes
-- Date: 2025-01-27
-- Description: Rendre type_collaborateur_id nullable dans la table postes

-- =====================================================
-- 1. CORRECTION DE LA TABLE POSTES
-- =====================================================

-- Rendre la colonne type_collaborateur_id nullable
ALTER TABLE postes ALTER COLUMN type_collaborateur_id DROP NOT NULL;

-- =====================================================
-- 2. COMMENTAIRES
-- =====================================================
COMMENT ON COLUMN postes.type_collaborateur_id IS 'Type de collaborateur associé (optionnel)'; 