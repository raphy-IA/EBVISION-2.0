-- Migration: Ajout de la colonne sigle à la table clients
-- Date: 2025-07-29
-- Description: Ajout d'un champ sigle pour l'abréviation du nom du client

-- Ajout de la colonne sigle
ALTER TABLE clients ADD COLUMN sigle VARCHAR(20);

-- Index pour optimiser les recherches par sigle
CREATE INDEX idx_clients_sigle ON clients(sigle);

-- Mise à jour des données existantes avec des sigles basés sur les noms
UPDATE clients 
SET sigle = UPPER(SUBSTRING(nom, 1, 3))
WHERE sigle IS NULL AND nom IS NOT NULL;

-- Commentaire sur la colonne
COMMENT ON COLUMN clients.sigle IS 'Abréviation ou sigle du nom du client pour identification rapide';