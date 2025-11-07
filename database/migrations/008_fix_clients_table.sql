-- Migration 008: Correction de la table clients (ancienne version)
-- Date: 2025-07-18

-- Cette migration ciblait l'ancien schéma "utilisateurs" / clients. Depuis la refonte
-- (migrations 001-006), ces colonnes/contraintes existent déjà avec d'autres noms.
-- Pour éviter les conflits (références à "utilisateurs", colonnes redéfinies, données de test),
-- on ignore désormais cette migration.

DO $$
BEGIN
    RAISE NOTICE 'Migration 008_fix_clients_table.sql ignorée (schéma déjà géré par migrations 001-006).';
END$$;