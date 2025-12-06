-- RESET COMPLET des feuilles de temps
-- Supprime TOUTES les feuilles et entrées pour repartir à zéro

-- 1. Supprimer toutes les entrées d'heures
DELETE FROM time_entries;

-- 2. Supprimer toutes les feuilles de temps
DELETE FROM time_sheets;

-- 3. Afficher le résultat
SELECT 
    'time_entries' as table_name,
    COUNT(*) as remaining_rows
FROM time_entries
UNION ALL
SELECT 
    'time_sheets' as table_name,
    COUNT(*) as remaining_rows
FROM time_sheets;
