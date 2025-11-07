-- Migration 1000: Suppression de l'étape "Discovery / Prise de contact" (OBSOLÈTE)
-- Date: 2025-08-09

-- Cette migration dépend de opportunity_stage_templates créée par la migration 024,
-- que nous avons ignorée car incompatible avec la migration 020.
-- Pour éviter les erreurs, nous marquons cette migration comme ignorée.

DO $$
BEGIN
    RAISE NOTICE 'Migration 1000_remove_discovery_step.sql ignorée (dépend de migration 024 ignorée).';
END$$;
