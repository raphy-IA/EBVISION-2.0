-- Migration 025: Création des templates d'étapes par défaut (OBSOLÈTE)
-- Date: 2025-07-21

-- Cette migration dépend de la table opportunity_stage_templates créée par la migration 024,
-- que nous avons ignorée car incompatible avec la migration 020.
-- Pour éviter les erreurs, nous marquons cette migration comme ignorée.

DO $$
BEGIN
    RAISE NOTICE 'Migration 025_create_default_stage_templates.sql ignorée (dépend de migration 024 ignorée).';
END$$;
