-- Migration 007: Création des tables clients/missions (ancienne version)
-- Date: 2025-07-18

-- Cette migration était conçue avant la refonte complète des tables clients, missions,
-- opportunités, etc. Les structures sont désormais gérées par les migrations 001 à 006
-- et par les migrations suivantes (005_create_business_tables.sql puis 006_restructure_models.sql).
-- Pour éviter les conflits de schéma (doublons de colonnes, contraintes, triggers) et les
-- erreurs de syntaxe liées à des syntaxes dépassées, nous marquons cette migration comme
-- ignorée. Cela permet de garder l’historique tout en assurant la compatibilité.

DO $$
BEGIN
    RAISE NOTICE 'Migration 007_create_clients_missions.sql ignorée (schéma déjà géré par migrations 001-006).';
END$$;