-- Migration pour corriger la fonction get_week_dates
-- Le problème est une ambiguïté dans les noms de colonnes

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS get_week_dates(INTEGER, INTEGER);

-- Recréer la fonction avec des noms de colonnes explicites
CREATE OR REPLACE FUNCTION get_week_dates(week_number INTEGER, year_number INTEGER)
RETURNS TABLE(date_debut DATE, date_fin DATE) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        week_start::DATE as date_debut,
        (week_start + INTERVAL '6 days')::DATE as date_fin
    FROM (
        SELECT 
            DATE_TRUNC('week', TO_DATE(year_number || '-' || week_number || '-1', 'IYYY-IW-ID')) + INTERVAL '1 day' as week_start
    ) as week_calc;
END;
$$ LANGUAGE plpgsql; 