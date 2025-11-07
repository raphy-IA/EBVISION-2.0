-- Migration 999: Ajout du type d'opportunité "Vente standard" (OBSOLÈTE)
-- Date: 2025-08-09

-- Cette migration dépend de opportunity_types et opportunity_stage_templates créés par la migration 024,
-- que nous avons ignorée car incompatible avec la migration 020.
-- Pour éviter les erreurs, nous marquons cette migration comme ignorée.

DO $$
BEGIN
    RAISE NOTICE 'Migration 999_add_standard_sales_pipeline.sql ignorée (dépend de migration 024 ignorée).';
END$$;
