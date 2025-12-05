-- Migration 020: Création de la table d'allocation des paiements et trigger automatique
-- Date: 2025-12-05
-- Description: Allocation des paiements aux factures (many-to-many) avec mise à jour automatique

BEGIN;

-- Table d'allocation
CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    allocated_amount DECIMAL(15,2) NOT NULL CHECK (allocated_amount > 0),
    allocation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice ON payment_allocations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_date ON payment_allocations(allocation_date);

-- Vue pour faciliter les requêtes de statut de paiement
CREATE OR REPLACE VIEW v_invoice_payment_status AS
SELECT 
    i.id as invoice_id,
    i.numero_facture,
    i.montant_ttc,
    COALESCE(SUM(pa.allocated_amount), 0) as total_paid,
    i.montant_ttc - COALESCE(SUM(pa.allocated_amount), 0) as remaining_amount,
    CASE 
        WHEN COALESCE(SUM(pa.allocated_amount), 0) = 0 THEN 'NON_PAYEE'
        WHEN COALESCE(SUM(pa.allocated_amount), 0) >= i.montant_ttc THEN 'PAYEE'
        ELSE 'PAYEE_PARTIELLEMENT'
    END as payment_status
FROM invoices i
LEFT JOIN payment_allocations pa ON i.id = pa.invoice_id
GROUP BY i.id, i.numero_facture, i.montant_ttc;

-- Fonction pour mettre à jour automatiquement montant_paye et montant_restant
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

-- Trigger sur INSERT, UPDATE et DELETE de payment_allocations
DROP TRIGGER IF EXISTS trigger_update_invoice_payment_amounts ON payment_allocations;
CREATE TRIGGER trigger_update_invoice_payment_amounts
    AFTER INSERT OR UPDATE OR DELETE ON payment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payment_amounts();

-- Commentaires
COMMENT ON TABLE payment_allocations IS 'Allocation des paiements aux factures (relation many-to-many)';
COMMENT ON COLUMN payment_allocations.allocated_amount IS 'Montant alloué de ce paiement à cette facture';
COMMENT ON VIEW v_invoice_payment_status IS 'Vue pour consulter facilement le statut de paiement des factures';

COMMIT;
