-- Migration 013: Créer des divisions par défaut pour les business units sans division
-- Date: 2025-07-20

-- 1. Identifier les business units sans division
WITH business_units_without_divisions AS (
    SELECT bu.id, bu.nom, bu.code
    FROM business_units bu
    LEFT JOIN divisions d ON bu.id = d.business_unit_id
    WHERE d.id IS NULL
)

-- 2. Créer des divisions par défaut pour ces business units
INSERT INTO divisions (id, nom, code, business_unit_id, responsable_id, description, statut, created_at, updated_at)
SELECT 
    gen_random_uuid() as id,
    bu.nom as nom,  -- Même nom que la BU
    COALESCE(bu.code, 'DIV_' || substring(bu.nom from 1 for 3)) as code,  -- Code basé sur le nom
    bu.id as business_unit_id,
    NULL as responsable_id,  -- Pas de responsable par défaut
    'Division par défaut de la business unit ' || bu.nom as description,
    'ACTIF' as statut,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM business_units_without_divisions bu;

-- 3. Afficher le résultat
SELECT 
    'Divisions par défaut créées' as action,
    COUNT(*) as count
FROM divisions d
JOIN business_units bu ON d.business_unit_id = bu.id
WHERE d.nom = bu.nom AND d.description LIKE 'Division par défaut de la business unit%'; 