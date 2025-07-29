-- Migration 030: Ajouter le champ sous_secteur_activite_id à la table clients
-- Date: 2025-01-29

-- Ajouter la colonne sous_secteur_activite_id
ALTER TABLE clients 
ADD COLUMN sous_secteur_activite_id UUID;

-- Ajouter un index pour améliorer les performances des requêtes
CREATE INDEX idx_clients_sous_secteur_activite_id ON clients(sous_secteur_activite_id);

-- Ajouter une contrainte de clé étrangère
ALTER TABLE clients 
ADD CONSTRAINT fk_clients_sous_secteur_activite 
FOREIGN KEY (sous_secteur_activite_id) 
REFERENCES sous_secteurs_activite(id) 
ON DELETE SET NULL;

-- Ajouter un commentaire sur la colonne
COMMENT ON COLUMN clients.sous_secteur_activite_id IS 'Référence vers le sous-secteur d''activité du client';

-- Mettre à jour les clients existants qui ont des valeurs dans secteur_activite
-- qui contiennent " > " (format secteur > sous-secteur)
UPDATE clients 
SET sous_secteur_activite_id = (
    SELECT ss.id 
    FROM sous_secteurs_activite ss
    JOIN secteurs_activite s ON ss.secteur_id = s.id
    WHERE CONCAT(s.nom, ' > ', ss.nom) = clients.secteur_activite
)
WHERE secteur_activite LIKE '% > %';

-- Nettoyer les valeurs secteur_activite qui contiennent " > " 
-- en gardant seulement le nom du secteur principal
UPDATE clients 
SET secteur_activite = (
    SELECT s.nom 
    FROM secteurs_activite s
    JOIN sous_secteurs_activite ss ON s.id = ss.secteur_id
    WHERE CONCAT(s.nom, ' > ', ss.nom) = clients.secteur_activite
)
WHERE secteur_activite LIKE '% > %';