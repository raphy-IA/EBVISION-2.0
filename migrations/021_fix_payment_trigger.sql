-- Migration 021: Correction du trigger de paiement pour les colonnes générées
-- Date: 2025-12-05
-- Description: Modifie la fonction trigger pour ne plus essayer de mettre à jour manuellement 'montant_restant' qui est une colonne générée

BEGIN;

CREATE OR REPLACE FUNCTION update_invoice_payment_amounts()
RETURNS TRIGGER AS $$
DECLARE
    target_invoice_id UUID;
    total_allocated DECIMAL(15,2);
    invoice_total DECIMAL(15,2);
BEGIN
    -- Déterminer l'invoice_id concernée
    IF TG_OP = 'DELETE' THEN
        target_invoice_id := OLD.invoice_id;
    ELSE
        target_invoice_id := NEW.invoice_id;
    END IF;
    
    -- Calculer le total payé pour cette facture
    SELECT COALESCE(SUM(allocated_amount), 0)
    INTO total_allocated
    FROM payment_allocations
    WHERE invoice_id = target_invoice_id;
    
    -- Récupérer le montant TTC de la facture
    SELECT montant_ttc
    INTO invoice_total
    FROM invoices
    WHERE id = target_invoice_id;
    
    -- Mettre à jour montant_paye (montant_restant est généré automatiquement)
    UPDATE invoices
    SET 
        montant_paye = total_allocated,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = target_invoice_id;
    
    -- Mettre à jour le workflow_status si la facture est EMISE
    UPDATE invoices
    SET workflow_status = CASE
        WHEN total_allocated >= invoice_total THEN 'PAYEE'
        WHEN total_allocated > 0 THEN 'PAYEE_PARTIELLEMENT'
        ELSE workflow_status
    END
    WHERE id = target_invoice_id 
      AND workflow_status IN ('EMISE', 'PAYEE_PARTIELLEMENT');
    
    -- Retourner la ligne appropriée
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMIT;
