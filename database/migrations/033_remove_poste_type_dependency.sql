-- Migration 033: Suppression de la dépendance entre postes et types de collaborateurs
-- Date: 2025-07-29
-- Description: Supprimer la relation entre postes et types de collaborateurs

-- =====================================================
-- 1. SUPPRESSION DE LA COLONNE TYPE_COLLABORATEUR_ID
-- =====================================================

-- Supprimer la contrainte de clé étrangère
ALTER TABLE postes DROP CONSTRAINT IF EXISTS postes_type_collaborateur_id_fkey;

-- Supprimer l'index
DROP INDEX IF EXISTS idx_postes_type_collaborateur;

-- Supprimer la colonne
ALTER TABLE postes DROP COLUMN IF EXISTS type_collaborateur_id;

-- =====================================================
-- 2. MISE À JOUR DES COMMENTAIRES
-- =====================================================
COMMENT ON TABLE postes IS 'Postes occupés par les collaborateurs (indépendants des types)';
COMMENT ON COLUMN postes.nom IS 'Nom du poste';
COMMENT ON COLUMN postes.code IS 'Code unique du poste';
COMMENT ON COLUMN postes.description IS 'Description du poste';

-- =====================================================
-- 3. COMMENTAIRES
-- =====================================================
COMMENT ON TABLE postes IS 'Postes occupés par les collaborateurs (indépendants des types de collaborateurs)';