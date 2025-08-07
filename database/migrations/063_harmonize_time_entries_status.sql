-- Migration pour harmoniser le champ statut dans time_entries
-- Renommer statut en status et harmoniser les valeurs

-- 1. Renommer la colonne statut en status
ALTER TABLE time_entries RENAME COLUMN statut TO status;

-- 2. Supprimer l'ancienne contrainte de vérification
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_statut_check;

-- 3. Mettre à jour les valeurs existantes
UPDATE time_entries SET status = 'saved' WHERE status = 'saisie';
UPDATE time_entries SET status = 'submitted' WHERE status = 'soumis';
UPDATE time_entries SET status = 'approved' WHERE status = 'validé';
UPDATE time_entries SET status = 'rejected' WHERE status = 'rejeté';

-- 4. Créer la nouvelle contrainte de vérification avec les valeurs harmonisées
ALTER TABLE time_entries ADD CONSTRAINT time_entries_status_check 
CHECK (status IN ('saved', 'submitted', 'approved', 'rejected'));

-- 5. Mettre à jour la valeur par défaut
ALTER TABLE time_entries ALTER COLUMN status SET DEFAULT 'saved';

-- 6. Vérifier que la contrainte fonctionne
-- (Cette ligne sera commentée car elle est juste pour vérifier)
-- INSERT INTO time_entries (time_sheet_id, user_id, date_saisie, heures, type_heures) 
-- VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '2025-01-01', 0, 'HC');
