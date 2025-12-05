-- Migration 019: Création de la table des paiements
-- Date: 2025-12-05
-- Description: Paiements reçus (peuvent être alloués à une ou plusieurs factures)

BEGIN;

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    payment_date DATE NOT NULL,
    payment_mode VARCHAR(20) NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'XAF',
    reference VARCHAR(100), -- Numéro de chèque, référence virement, etc.
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id)
);

-- Contrainte de mode de paiement
-- Contrainte de mode de paiement
ALTER TABLE payments DROP CONSTRAINT IF EXISTS check_payment_mode;
ALTER TABLE payments
ADD CONSTRAINT check_payment_mode CHECK (
    payment_mode IN ('VIREMENT', 'CHEQUE', 'ESPECES', 'MOBILE_MONEY')
);

-- Index
CREATE INDEX IF NOT EXISTS idx_payments_bank_account ON payments(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_mode ON payments(payment_mode);
CREATE INDEX IF NOT EXISTS idx_payments_number ON payments(payment_number);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON payments(created_by);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_payments_updated_at ON payments;
CREATE TRIGGER trigger_update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- Commentaires
COMMENT ON TABLE payments IS 'Paiements reçus (peuvent être alloués à une ou plusieurs factures)';
COMMENT ON COLUMN payments.payment_number IS 'Numéro unique du paiement (ex: PAY-AUD-202512-0001)';
COMMENT ON COLUMN payments.payment_mode IS 'Mode de paiement: VIREMENT, CHEQUE, ESPECES, MOBILE_MONEY';
COMMENT ON COLUMN payments.reference IS 'Référence externe (numéro de chèque, référence virement, etc.)';
COMMENT ON COLUMN payments.amount IS 'Montant total du paiement';

COMMIT;
