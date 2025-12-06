-- Migration pour corriger la contrainte de statut sur time_entries
-- Le problème : time_sheets utilise 'sauvegardé' mais time_entries utilise 'saisie'
-- Le trigger de synchronisation essaie de copier 'sauvegardé' dans time_entries, ce qui échoue

-- 1. Supprimer l'ancienne contrainte
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_statut_check;

-- 2. Ajouter la nouvelle contrainte avec les bonnes valeurs (alignées sur time_sheets)
-- On garde 'saisie' pour la compatibilité avec les données existantes temporairement, 
-- mais on ajoute 'sauvegardé' et 'brouillon' pour être sûr.
ALTER TABLE time_entries 
ADD CONSTRAINT time_entries_statut_check 
CHECK (statut IN ('saisie', 'sauvegardé', 'brouillon', 'soumis', 'validé', 'rejeté'));

-- 3. Mettre à jour les valeurs par défaut pour utiliser 'sauvegardé' au lieu de 'saisie' à l'avenir
ALTER TABLE time_entries ALTER COLUMN statut SET DEFAULT 'sauvegardé';

-- 4. Harmoniser les données existantes (optionnel mais recommandé)
-- Si des entrées sont en 'saisie', on les passe en 'sauvegardé' pour être cohérent
UPDATE time_entries SET statut = 'sauvegardé' WHERE statut = 'saisie';

-- 5. Force update data integrity
-- Ensure explicit consistency with parent time_sheet status
UPDATE time_entries te
SET statut = ts.statut
FROM time_sheets ts
WHERE te.time_sheet_id = ts.id
  AND te.statut != ts.statut;
