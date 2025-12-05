-- Migration 018: Création de la table des comptes bancaires par BU
-- Date: 2025-12-05
-- Description: Comptes bancaires associés à chaque Business Unit

BEGIN;

CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
    financial_institution_id UUID NOT NULL REFERENCES financial_institutions(id),
    account_number VARCHAR(50) NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    iban VARCHAR(34),
    currency VARCHAR(3) DEFAULT 'XAF',
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    UNIQUE(business_unit_id, account_number)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_bank_accounts_bu ON bank_accounts(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_institution ON bank_accounts(financial_institution_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_default ON bank_accounts(business_unit_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON bank_accounts(is_active) WHERE is_active = true;

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_bank_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bank_accounts_updated_at ON bank_accounts;
CREATE TRIGGER trigger_update_bank_accounts_updated_at
    BEFORE UPDATE ON bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_accounts_updated_at();

-- Commentaires
COMMENT ON TABLE bank_accounts IS 'Comptes bancaires par Business Unit';
COMMENT ON COLUMN bank_accounts.is_default IS 'Compte par défaut pour cette BU (un seul par BU)';
COMMENT ON COLUMN bank_accounts.account_number IS 'Numéro de compte bancaire';
COMMENT ON COLUMN bank_accounts.iban IS 'IBAN (optionnel, pour virements internationaux)';

COMMIT;
