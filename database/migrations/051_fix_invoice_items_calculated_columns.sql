-- Migration pour corriger les colonnes calculées de invoice_items
-- Les colonnes calculées ne doivent pas être NOT NULL car elles sont générées automatiquement

-- Supprimer les contraintes NOT NULL des colonnes calculées
ALTER TABLE invoice_items 
    ALTER COLUMN montant_ht DROP NOT NULL,
    ALTER COLUMN montant_tva DROP NOT NULL,
    ALTER COLUMN montant_ttc DROP NOT NULL;

-- Vérifier que les colonnes calculées fonctionnent correctement
-- Les colonnes calculées seront automatiquement remplies lors de l'insertion 