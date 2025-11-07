-- Migration 019: Création de la table opportunities (version basique - OBSOLÈTE)
-- Date: 2025-07-20

-- Cette migration est une version obsolète de 019_create_opportunities_table.sql
-- La table opportunities est déjà gérée par la migration principale 019_create_opportunities_table.sql
-- Pour éviter les conflits (doublons de triggers, contraintes), nous marquons cette migration comme ignorée.

DO $$
BEGIN
    RAISE NOTICE 'Migration 019_create_opportunities_table_basic.sql ignorée (version obsolète, remplacée par 019_create_opportunities_table.sql).';
END$$;
