-- Migration 034: Configuration des permissions et données pour les objectifs
-- Description: Ajout de la permission pour le menu de configuration et amorçage des métriques par défaut

BEGIN;

-- 1. Création de la permission pour le menu si elle n'existe pas
INSERT INTO permissions (code, name, category, nom, module, created_at, updated_at)
VALUES ('menu.gestion_rh.configuration_objectifs', 'Configuration des Objectifs', 'menu', 'Configuration des Objectifs', 'RH', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- 2. Attribution de la permission aux rôles concernés (SUPER_ADMIN et ADMIN_IT)
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, CURRENT_TIMESTAMP
FROM roles r, permissions p
WHERE r.name IN ('SUPER_ADMIN', 'ADMIN_IT', 'DG')
AND p.code = 'menu.gestion_rh.configuration_objectifs'
ON CONFLICT DO NOTHING;

-- 3. Amorçage des métriques d'objectifs (Metrics)
-- Note: On utilise le premier code devise trouvé (EUR ou XOF) pour les montants financiers
INSERT INTO objective_metrics (code, label, description, calculation_type, target_unit_id, is_active)
VALUES 
    ('CA_TOTAL', 'Chiffre d''Affaires Total', 'Somme du CA des opportunités gagnées et du revenu des missions terminées', 'SUM', (SELECT id FROM objective_units WHERE code IN ('XOF', 'EUR') ORDER BY (code = 'XOF') DESC LIMIT 1), TRUE),
    ('NB_OPPORTUNITES', 'Nombre d''Opportunités', 'Nombre total de nouvelles opportunités créées', 'SUM', (SELECT id FROM objective_units WHERE code = 'COUNT' LIMIT 1), TRUE),
    ('NB_CONTRATS', 'Nombre de Contrats', 'Nombre d''opportunités gagnées (équivalent contrats)', 'SUM', (SELECT id FROM objective_units WHERE code = 'COUNT' LIMIT 1), TRUE),
    ('CLIENTS_COUNT', 'Nombre de Clients', 'Nombre de nouveaux clients créés', 'SUM', (SELECT id FROM objective_units WHERE code = 'COUNT' LIMIT 1), TRUE),
    ('CASH_COLLECTED', 'Encaissements', 'Montant total des encaissements (factures payées)', 'SUM', (SELECT id FROM objective_units WHERE code IN ('XOF', 'EUR') ORDER BY (code = 'XOF') DESC LIMIT 1), TRUE)
ON CONFLICT (code) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    calculation_type = EXCLUDED.calculation_type,
    target_unit_id = EXCLUDED.target_unit_id,
    is_active = TRUE,
    updated_at = CURRENT_TIMESTAMP;

-- 4. Amorçage des sources de métriques (Metric Sources)
-- On nettoie d'abord pour éviter les doublons ou conflits de poids lors des mises à jour
DELETE FROM objective_metric_sources WHERE metric_id IN (SELECT id FROM objective_metrics WHERE code IN ('CA_TOTAL', 'NB_OPPORTUNITES', 'NB_CONTRATS', 'CLIENTS_COUNT', 'CASH_COLLECTED'));

INSERT INTO objective_metric_sources (metric_id, objective_type_id, weight)
SELECT m.id, t.id, 1.0
FROM objective_metrics m, objective_types t
WHERE (m.code = 'CA_TOTAL' AND t.code IN ('OPP_WON_AMOUNT', 'MISS_REVENUE'))
   OR (m.code = 'NB_OPPORTUNITES' AND t.code = 'OPP_NEW_COUNT')
   OR (m.code = 'NB_CONTRATS' AND t.code = 'OPP_WON_COUNT')
   OR (m.code = 'CLIENTS_COUNT' AND t.code = 'CLIENT_NEW')
   OR (m.code = 'CASH_COLLECTED' AND t.code = 'INV_PAID_AMT');

COMMIT;
