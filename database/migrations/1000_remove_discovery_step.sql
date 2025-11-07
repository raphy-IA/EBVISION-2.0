-- Migration 1000: Suppression de l'étape "Discovery / Prise de contact" redondante
-- Date: 2025-08-09

-- 1) Supprimer les étapes existantes qui utilisent le template "Discovery / Prise de contact"
DELETE FROM opportunity_stages 
WHERE stage_template_id IN (
    SELECT id FROM opportunity_stage_templates 
    WHERE stage_name = 'Discovery / Prise de contact' 
    AND opportunity_type_id IN (SELECT id FROM opportunity_types WHERE name = 'Vente standard')
);

-- 2) Supprimer l'étape "Discovery / Prise de contact" (étape 3)
DELETE FROM opportunity_stage_templates 
WHERE stage_name = 'Discovery / Prise de contact' 
AND opportunity_type_id IN (SELECT id FROM opportunity_types WHERE name = 'Vente standard');

-- 3) Mettre à jour les numéros d'ordre des étapes suivantes
UPDATE opportunity_stage_templates 
SET stage_order = stage_order - 1
WHERE stage_order > 3 
AND opportunity_type_id IN (SELECT id FROM opportunity_types WHERE name = 'Vente standard');

-- 4) Marquer la migration comme exécutée
INSERT INTO migrations (filename, executed_at)
VALUES ('1000_remove_discovery_step.sql', CURRENT_TIMESTAMP)
ON CONFLICT (filename) DO NOTHING;