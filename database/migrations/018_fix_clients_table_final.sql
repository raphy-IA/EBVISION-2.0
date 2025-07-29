-- Migration 018: Correction finale de la table clients
-- Date: 2025-07-20

-- 1. Renommer les colonnes de dates pour correspondre au modèle
ALTER TABLE clients RENAME COLUMN date_creation TO created_at;
ALTER TABLE clients RENAME COLUMN date_modification TO updated_at;

-- 2. Ajouter les colonnes manquantes
ALTER TABLE clients ADD COLUMN IF NOT EXISTS nombre_missions INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS nombre_opportunites INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS chiffre_affaires_total NUMERIC(15,2) DEFAULT 0;

-- 3. Ajouter des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_clients_statut ON clients(statut);
CREATE INDEX IF NOT EXISTS idx_clients_collaborateur_id ON clients(collaborateur_id);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);
CREATE INDEX IF NOT EXISTS idx_clients_secteur_activite ON clients(secteur_activite);

-- 4. Ajouter des contraintes de validation
ALTER TABLE clients ADD CONSTRAINT IF NOT EXISTS chk_clients_statut 
    CHECK (statut IN ('prospect', 'client', 'client_fidele', 'abandonne'));

ALTER TABLE clients ADD CONSTRAINT IF NOT EXISTS chk_clients_notation 
    CHECK (notation IN ('A', 'B', 'C', 'D', 'E') OR notation IS NULL);

ALTER TABLE clients ADD CONSTRAINT IF NOT EXISTS chk_clients_risque_client 
    CHECK (risque_client IN ('faible', 'moyen', 'eleve', 'critique'));

-- 5. Mettre à jour les valeurs par défaut
UPDATE clients SET 
    nombre_missions = 0,
    nombre_opportunites = 0,
    chiffre_affaires_total = COALESCE(chiffre_affaires, 0)
WHERE nombre_missions IS NULL OR nombre_opportunites IS NULL OR chiffre_affaires_total IS NULL;

-- 6. Vérifier la structure finale
SELECT 
    'Structure de la table clients après migration' as info,
    COUNT(*) as nombre_colonnes
FROM information_schema.columns 
WHERE table_name = 'clients'; 