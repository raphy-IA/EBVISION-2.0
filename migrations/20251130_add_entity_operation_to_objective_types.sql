-- Migration: Ajout des colonnes entity_type, operation, et value_field à objective_types
-- Date: 2025-11-30
-- Description: Permet de lier les types d'objectifs à des entités applicatives avec des opérations spécifiques

BEGIN;

-- Ajouter les nouvelles colonnes à objective_types
ALTER TABLE objective_types
ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS operation VARCHAR(50),
ADD COLUMN IF NOT EXISTS value_field VARCHAR(100);

-- Ajouter un commentaire pour documenter les colonnes
COMMENT ON COLUMN objective_types.entity_type IS 'Type d''entité applicative (OPPORTUNITY, CAMPAIGN, CUSTOMER, etc.)';
COMMENT ON COLUMN objective_types.operation IS 'Opération déclenchant le tracking (CREATED, WON, CONVERTED, etc.)';
COMMENT ON COLUMN objective_types.value_field IS 'Champ à récupérer pour la valeur (amount, id, etc.)';

-- Rendre target_unit_id NOT NULL dans objective_metrics (après avoir mis à jour les données existantes)
-- Note: Cette partie sera exécutée après avoir vérifié qu'il n'y a pas de métriques sans unité

-- UPDATE objective_metrics SET target_unit_id = (SELECT id FROM objective_units WHERE code = 'COUNT' LIMIT 1)
-- WHERE target_unit_id IS NULL;

-- ALTER TABLE objective_metrics
-- ALTER COLUMN target_unit_id SET NOT NULL;

-- Ajouter un index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_objective_types_entity_operation 
ON objective_types(entity_type, operation);

COMMIT;

-- Instructions de rollback si nécessaire:
-- BEGIN;
-- ALTER TABLE objective_types DROP COLUMN IF EXISTS entity_type;
-- ALTER TABLE objective_types DROP COLUMN IF EXISTS operation;
-- ALTER TABLE objective_types DROP COLUMN IF EXISTS value_field;
-- DROP INDEX IF EXISTS idx_objective_types_entity_operation;
-- COMMIT;
