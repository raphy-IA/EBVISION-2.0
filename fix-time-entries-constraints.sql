-- Script de correction des contraintes pour time_entries
-- Suppression des contraintes trop strictes qui empêchent la sauvegarde

-- 1. Supprimer les contraintes problématiques
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS check_hc_requires_mission;
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS check_hc_requires_task;
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS check_hnc_requires_internal_activity;

-- 2. Recréer des contraintes plus flexibles
-- Pour les heures chargeables (HC) : mission_id peut être NULL, task_id peut être NULL
-- Pour les heures non-chargeables (HNC) : internal_activity_id peut être NULL
ALTER TABLE time_entries ADD CONSTRAINT check_hc_mission_consistency CHECK (
    (type_heures = 'HC' AND mission_id IS NOT NULL) OR 
    (type_heures = 'HNC' AND mission_id IS NULL)
);

ALTER TABLE time_entries ADD CONSTRAINT check_hc_task_consistency CHECK (
    (type_heures = 'HC' AND task_id IS NULL) OR 
    (type_heures = 'HNC' AND task_id IS NULL)
);

ALTER TABLE time_entries ADD CONSTRAINT check_hnc_activity_consistency CHECK (
    (type_heures = 'HNC' AND internal_activity_id IS NULL) OR 
    (type_heures = 'HC' AND internal_activity_id IS NULL)
);

-- 3. Vérifier que les contraintes ont été appliquées
SELECT 
    table_name,
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE table_name = 'time_entries'
ORDER BY constraint_name;

-- 4. Test d'insertion pour vérifier que tout fonctionne
DO $$
DECLARE
    test_id UUID;
    test_time_sheet_id UUID;
BEGIN
    -- Créer une feuille de temps de test
    INSERT INTO time_sheets (
        user_id, week_start, week_end, statut
    ) VALUES (
        'f6a6567f-b51d-4dbc-872d-1005156bd187',
        '2025-08-04',
        '2025-08-10',
        'sauvegardé'
    ) RETURNING id INTO test_time_sheet_id;
    
    RAISE NOTICE 'Feuille de temps de test créée, ID: %', test_time_sheet_id;
    
    -- Test 1: Entrée HC avec mission mais sans tâche (devrait fonctionner)
    INSERT INTO time_entries (
        time_sheet_id, user_id, date_saisie, heures, type_heures, mission_id, task_id, internal_activity_id
    ) VALUES (
        test_time_sheet_id,
        'f6a6567f-b51d-4dbc-872d-1005156bd187',
        '2025-08-04',
        8.0,
        'HC',
        'f1b5a971-3a94-473d-af5b-7922348d8a1d',
        NULL,
        NULL
    ) RETURNING id INTO test_id;
    
    RAISE NOTICE 'Test 1 réussi - HC avec mission sans tâche, ID: %', test_id;
    
    -- Test 2: Entrée HNC sans activité interne (devrait fonctionner)
    INSERT INTO time_entries (
        time_sheet_id, user_id, date_saisie, heures, type_heures, mission_id, task_id, internal_activity_id
    ) VALUES (
        test_time_sheet_id,
        'f6a6567f-b51d-4dbc-872d-1005156bd187',
        '2025-08-05',
        4.0,
        'HNC',
        NULL,
        NULL,
        NULL
    ) RETURNING id INTO test_id;
    
    RAISE NOTICE 'Test 2 réussi - HNC sans activité interne, ID: %', test_id;
    
    -- Nettoyer les tests
    DELETE FROM time_entries WHERE time_sheet_id = test_time_sheet_id;
    DELETE FROM time_sheets WHERE id = test_time_sheet_id;
    
    RAISE NOTICE 'Tous les tests de contraintes ont réussi !';
END $$;
