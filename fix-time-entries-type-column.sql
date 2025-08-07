-- Migration pour corriger la colonne type_heures dans time_entries
-- Le problème: type_heures est défini comme VARCHAR(3) mais le frontend envoie 'chargeable' et 'non_chargeable'

-- 1. Modifier la colonne type_heures pour accepter des valeurs plus longues
ALTER TABLE time_entries 
ALTER COLUMN type_heures TYPE VARCHAR(20);

-- 2. Supprimer l'ancienne contrainte CHECK
ALTER TABLE time_entries 
DROP CONSTRAINT IF EXISTS time_entries_type_heures_check;

-- 3. Ajouter une nouvelle contrainte CHECK qui accepte les anciennes et nouvelles valeurs
ALTER TABLE time_entries 
ADD CONSTRAINT time_entries_type_heures_check 
CHECK (type_heures IN ('HC', 'HNC', 'chargeable', 'non_chargeable'));

-- 4. Vérifier la modification
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns 
WHERE table_name = 'time_entries' AND column_name = 'type_heures'; 