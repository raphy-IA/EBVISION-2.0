-- Migration pour corriger la fonction calculate_invoice_totals
-- Le problème est que la fonction ne met pas à jour correctement les totaux

-- Supprimer les triggers existants
DROP TRIGGER IF EXISTS trigger_calculate_invoice_totals_insert ON invoice_items;
DROP TRIGGER IF EXISTS trigger_calculate_invoice_totals_update ON invoice_items;
DROP TRIGGER IF EXISTS trigger_calculate_invoice_totals_delete ON invoice_items;

-- Recréer la fonction avec une logique plus robuste
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    invoice_id_param UUID;
    total_ht DECIMAL(15,2) := 0;
    total_tva DECIMAL(15,2) := 0;
    total_ttc DECIMAL(15,2) := 0;
BEGIN
    -- Déterminer l'ID de la facture
    IF TG_OP = 'DELETE' THEN
        invoice_id_param := OLD.invoice_id;
    ELSE
        invoice_id_param := NEW.invoice_id;
    END IF;
    
    -- Calculer les totaux à partir des lignes de facture
    SELECT 
        COALESCE(SUM(montant_ht), 0),
        COALESCE(SUM(montant_tva), 0),
        COALESCE(SUM(montant_ttc), 0)
    INTO total_ht, total_tva, total_ttc
    FROM invoice_items 
    WHERE invoice_id = invoice_id_param;
    
    -- Mettre à jour la facture
    UPDATE invoices 
    SET 
        montant_ht = total_ht,
        montant_tva = total_tva,
        montant_ttc = total_ttc,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = invoice_id_param;
    
    -- Retourner le bon record selon l'opération
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Recréer les triggers
CREATE TRIGGER trigger_calculate_invoice_totals_insert
    AFTER INSERT ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_totals();

CREATE TRIGGER trigger_calculate_invoice_totals_update
    AFTER UPDATE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_totals();

CREATE TRIGGER trigger_calculate_invoice_totals_delete
    AFTER DELETE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_totals(); 