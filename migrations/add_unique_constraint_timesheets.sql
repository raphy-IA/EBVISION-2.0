-- 1. Identifier et nettoyer les doublons
-- On garde la feuille la plus récente ou celle qui a des entrées
DO $$
DECLARE
    r RECORD;
    keep_id UUID;
BEGIN
    FOR r IN 
        SELECT user_id, week_start, array_agg(id ORDER BY created_at DESC) as sheet_ids
        FROM time_sheets
        GROUP BY user_id, week_start
        HAVING COUNT(*) > 1
    LOOP
        -- Garder la première (la plus récente) par défaut
        keep_id := r.sheet_ids[1];
        
        RAISE NOTICE 'Cleaning duplicates for user % week %', r.user_id, r.week_start;
        
        -- Mettre à jour les entrées pour qu'elles pointent vers la feuille gardée
        UPDATE time_entries 
        SET time_sheet_id = keep_id
        WHERE time_sheet_id = ANY(r.sheet_ids[2:]);
        
        -- Supprimer les feuilles en doublon
        DELETE FROM time_sheets 
        WHERE id = ANY(r.sheet_ids[2:]);
        
    END LOOP;
END $$;

-- 2. Ajouter la contrainte unique
ALTER TABLE time_sheets 
ADD CONSTRAINT unique_user_week 
UNIQUE (user_id, week_start);

-- 3. Ajouter index pour les requêtes de planification (optimisation pour la validation HC)
CREATE INDEX IF NOT EXISTS idx_task_assignments_collaborateur 
ON task_assignments(collaborateur_id, mission_task_id);
