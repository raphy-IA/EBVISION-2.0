-- Migration: Update v_objectives_hierarchy to include weight
-- Description: Adds the weight column to all levels of the objectives hierarchy view and fixes JOIN logic.

DROP VIEW IF EXISTS v_objectives_hierarchy;

CREATE VIEW v_objectives_hierarchy AS
SELECT 
    'GLOBAL' as level,
    go.id,
    go.fiscal_year_id,
    fy.annee as fiscal_year,
    ot.code as objective_type_code,
    ot.label as objective_type_label,
    go.target_value,
    ot.unit,
    NULL::NUMERIC as weight,
    NULL::UUID as business_unit_id,
    NULL::VARCHAR as business_unit_name,
    NULL::UUID as division_id,
    NULL::VARCHAR as division_name,
    NULL::UUID as collaborator_id,
    NULL::VARCHAR as collaborator_name
FROM global_objectives go
JOIN fiscal_years fy ON go.fiscal_year_id = fy.id
JOIN objective_types ot ON go.objective_type_id = ot.id

UNION ALL

SELECT 
    'BUSINESS_UNIT' as level,
    buo.id,
    go.fiscal_year_id,
    fy.annee as fiscal_year,
    ot.code as objective_type_code,
    ot.label as objective_type_label,
    buo.target_value,
    ot.unit,
    buo.weight,
    buo.business_unit_id,
    bu.nom as business_unit_name,
    NULL::UUID as division_id,
    NULL::VARCHAR as division_name,
    NULL::UUID as collaborator_id,
    NULL::VARCHAR as collaborator_name
FROM business_unit_objectives buo
JOIN global_objectives go ON buo.global_objective_id = go.id
JOIN fiscal_years fy ON go.fiscal_year_id = fy.id
JOIN objective_types ot ON go.objective_type_id = ot.id
JOIN business_units bu ON buo.business_unit_id = bu.id

UNION ALL

SELECT 
    'DIVISION' as level,
    dobj.id,
    go.fiscal_year_id,
    fy.annee as fiscal_year,
    ot.code as objective_type_code,
    ot.label as objective_type_label,
    dobj.target_value,
    ot.unit,
    dobj.weight,
    buo.business_unit_id,
    bu.nom as business_unit_name,
    dobj.division_id,
    d.nom as division_name,
    NULL::UUID as collaborator_id,
    NULL::VARCHAR as collaborator_name
FROM division_objectives dobj
JOIN business_unit_objectives buo ON (dobj.parent_bu_objective_id = buo.id OR dobj.business_unit_objective_id = buo.id)
JOIN global_objectives go ON buo.global_objective_id = go.id
JOIN fiscal_years fy ON go.fiscal_year_id = fy.id
JOIN objective_types ot ON go.objective_type_id = ot.id
LEFT JOIN business_units bu ON buo.business_unit_id = bu.id
JOIN divisions d ON dobj.division_id = d.id

UNION ALL

SELECT 
    'INDIVIDUAL' as level,
    io.id,
    go.fiscal_year_id,
    fy.annee as fiscal_year,
    ot.code as objective_type_code,
    ot.label as objective_type_label,
    io.target_value,
    ot.unit,
    io.weight,
    buo.business_unit_id,
    bu.nom as business_unit_name,
    dobj.division_id,
    d.nom as division_name,
    io.collaborator_id,
    CONCAT(c.prenom, ' ', c.nom) as collaborator_name
FROM individual_objectives io
JOIN division_objectives dobj ON (io.parent_division_objective_id = dobj.id OR io.division_objective_id = dobj.id)
JOIN business_unit_objectives buo ON (dobj.parent_bu_objective_id = buo.id OR dobj.business_unit_objective_id = buo.id)
JOIN global_objectives go ON buo.global_objective_id = go.id
JOIN fiscal_years fy ON go.fiscal_year_id = fy.id
JOIN objective_types ot ON go.objective_type_id = ot.id
LEFT JOIN business_units bu ON buo.business_unit_id = bu.id
LEFT JOIN divisions d ON dobj.division_id = d.id
JOIN collaborateurs c ON io.collaborator_id = c.id;
