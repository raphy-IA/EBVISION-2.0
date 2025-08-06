-- Script de correction des contraintes pour time_sheets et time_entries
-- Basé sur les erreurs observées dans les logs

-- 1. Supprimer les contraintes CHECK problématiques
ALTER TABLE time_sheets DROP CONSTRAINT IF EXISTS time_sheets_statut_check;
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_statut_check;

-- 2. Recréer les contraintes CHECK avec les bonnes valeurs
ALTER TABLE time_sheets ADD CONSTRAINT time_sheets_statut_check 
    CHECK (statut IN ('draft', 'submitted', 'approved', 'rejected'));

ALTER TABLE time_entries ADD CONSTRAINT time_entries_statut_check 
    CHECK (statut IN ('draft', 'submitted', 'approved', 'rejected', 'SAISIE'));

-- 3. Vérifier que les tables existent et ont la bonne structure
DO $$
BEGIN
    -- Vérifier time_sheets
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_sheets') THEN
        RAISE EXCEPTION 'Table time_sheets n''existe pas';
    END IF;
    
    -- Vérifier time_entries
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_entries') THEN
        RAISE EXCEPTION 'Table time_entries n''existe pas';
    END IF;
    
    RAISE NOTICE 'Tables vérifiées avec succès';
END $$;

-- 4. Vérifier les contraintes après correction
SELECT 
    table_name,
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%time_sheets%' OR constraint_name LIKE '%time_entries%'
ORDER BY table_name, constraint_name;

-- 5. Test d'insertion pour vérifier que tout fonctionne
DO $$
DECLARE
    test_id UUID;
BEGIN
    -- Test time_sheets
    INSERT INTO time_sheets (
        collaborateur_id, date_debut_semaine, date_fin_semaine, annee, semaine, statut
    ) VALUES (
        'f6a6567f-b51d-4dbc-872d-1005156bd187',
        '2025-08-04',
        '2025-08-10',
        2025,
        32,
        'draft'
    ) RETURNING id INTO test_id;
    
    RAISE NOTICE 'Test time_sheets réussi, ID: %', test_id;
    
    -- Nettoyer le test
    DELETE FROM time_sheets WHERE id = test_id;
    
    -- Test time_entries
    INSERT INTO time_entries (
        user_id, date_saisie, heures, type_heures, mission_id, description, statut
    ) VALUES (
        'f6a6567f-b51d-4dbc-872d-1005156bd187',
        '2025-08-04',
        8.0,
        'chargeable',
        'f1b5a971-3a94-473d-af5b-7922348d8a1d',
        'Test entry',
        'draft'
    ) RETURNING id INTO test_id;
    
    RAISE NOTICE 'Test time_entries réussi, ID: %', test_id;
    
    -- Nettoyer le test
    DELETE FROM time_entries WHERE id = test_id;
    
    RAISE NOTICE 'Tous les tests de contraintes ont réussi !';
END $$; 