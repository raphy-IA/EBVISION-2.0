-- Migration 017: Correction de la table clients - Ajout des colonnes manquantes
-- Date: 2025-07-20
-- Description: Ajout des colonnes essentielles pour le contexte africain

-- Ajout des colonnes manquantes à la table clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS numero_contribuable VARCHAR(20);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS forme_juridique VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS effectif INTEGER;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS chiffre_affaires DECIMAL(15,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS resultat_net DECIMAL(15,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notation VARCHAR(10);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS risque_client VARCHAR(20) DEFAULT 'faible';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS groupe_id UUID REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS est_filiale BOOLEAN DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS site_web VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS date_creation_entreprise DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS secteur_geographique VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS classification_abc VARCHAR(1);

-- Ajout d'index pour les nouvelles colonnes
CREATE INDEX IF NOT EXISTS idx_clients_contribuable ON clients(numero_contribuable);
CREATE INDEX IF NOT EXISTS idx_clients_notation ON clients(notation);
CREATE INDEX IF NOT EXISTS idx_clients_risque ON clients(risque_client);
CREATE INDEX IF NOT EXISTS idx_clients_ca ON clients(chiffre_affaires);

-- Mise à jour des données existantes avec des valeurs par défaut
UPDATE clients SET 
    forme_juridique = 'SARL',
    effectif = 50,
    chiffre_affaires = 10000000.00,
    resultat_net = 1000000.00,
    risque_client = 'moyen',
    secteur_geographique = 'Afrique de l\'Ouest'
WHERE forme_juridique IS NULL; 