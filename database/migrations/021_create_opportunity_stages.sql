-- Migration 021: Création de la table opportunity_stages (OBSOLÈTE)
-- Date: 2025-07-21

-- Cette migration est une version obsolète de 020_create_opportunity_stages.sql
-- La table opportunity_stages est déjà gérée par la migration 020
-- Pour éviter les conflits (doublons de tables, triggers), nous marquons cette migration comme ignorée.

DO $$
BEGIN
    RAISE NOTICE 'Migration 021_create_opportunity_stages.sql ignorée (version obsolète, remplacée par 020_create_opportunity_stages.sql).';
END$$;
