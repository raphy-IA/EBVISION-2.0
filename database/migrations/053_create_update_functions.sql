-- Migration pour créer les fonctions manquantes

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer automatiquement les montants de la facture
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour les montants de la facture basés sur les lignes
    UPDATE invoices 
    SET 
        montant_ht = COALESCE((
            SELECT SUM(montant_ht) 
            FROM invoice_items 
            WHERE invoice_id = NEW.invoice_id
        ), 0),
        montant_tva = COALESCE((
            SELECT SUM(montant_tva) 
            FROM invoice_items 
            WHERE invoice_id = NEW.invoice_id
        ), 0),
        montant_ttc = COALESCE((
            SELECT SUM(montant_ttc) 
            FROM invoice_items 
            WHERE invoice_id = NEW.invoice_id
        ), 0)
    WHERE id = NEW.invoice_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql; 