-- Migration 024: Refactorisation complète du système d'étapes d'opportunités (OBSOLÈTE)
-- Date: 2025-07-21

-- Cette migration tente de recréer la table opportunity_stages qui existe déjà depuis la migration 020.
-- Le CREATE TABLE IF NOT EXISTS ne fait rien si la table existe, donc les nouvelles colonnes
-- (risk_level, priority_level, etc.) ne sont jamais ajoutées, mais les index tentent de les utiliser.
-- Pour éviter les conflits, nous marquons cette migration comme ignorée.
-- Le système d'étapes de la migration 020 est suffisant pour les besoins actuels.

DO $$
BEGIN
    RAISE NOTICE 'Migration 024_refactor_opportunity_stages_advanced.sql ignorée (incompatible avec migration 020).';
END$$;
