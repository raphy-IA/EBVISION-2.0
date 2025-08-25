-- Migration 003: Ajouter une contrainte unique pour empêcher les doublons d'entreprises
-- Date: 2025-08-24

-- 1. Nettoyer les doublons existants en gardant seulement la première occurrence
DELETE FROM companies 
WHERE id NOT IN (
    SELECT DISTINCT ON (source_id, name) id
    FROM companies 
    WHERE source_id IS NOT NULL 
    ORDER BY source_id, name, created_at ASC
);

-- 2. Ajouter une contrainte unique sur (source_id, name)
-- Note: source_id peut être NULL, donc on utilise une contrainte partielle
ALTER TABLE companies 
ADD CONSTRAINT companies_source_name_unique 
UNIQUE (source_id, name);

-- 3. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_companies_source_name 
ON companies (source_id, name) 
WHERE source_id IS NOT NULL;
