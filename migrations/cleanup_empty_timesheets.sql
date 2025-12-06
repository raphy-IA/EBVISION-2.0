-- Nettoyage des feuilles de temps vides (sans entrées d'heures)
-- Ces feuilles ont été créées automatiquement mais n'ont jamais eu de données saisies

-- Supprimer les feuilles de temps qui n'ont aucune entrée associée
DELETE FROM time_sheets
WHERE id NOT IN (
    SELECT DISTINCT time_sheet_id 
    FROM time_entries
)
AND statut = 'sauvegardé';

-- Afficher le résultat
SELECT 
    COUNT(*) as feuilles_restantes,
    statut
FROM time_sheets
GROUP BY statut;
