-- Migration 017: Création de la table des établissements financiers
-- Date: 2025-12-05
-- Description: Catalogue des banques et services de mobile money

BEGIN;

CREATE TABLE IF NOT EXISTS financial_institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) DEFAULT 'BANK', -- 'BANK', 'MOBILE_MONEY', 'OTHER'
    country VARCHAR(3) DEFAULT 'CMR',
    swift_code VARCHAR(11),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contrainte de type
ALTER TABLE financial_institutions DROP CONSTRAINT IF EXISTS check_institution_type;
ALTER TABLE financial_institutions
ADD CONSTRAINT check_institution_type CHECK (
    type IN ('BANK', 'MOBILE_MONEY', 'OTHER')
);

-- Index
CREATE INDEX IF NOT EXISTS idx_financial_institutions_code ON financial_institutions(code);
CREATE INDEX IF NOT EXISTS idx_financial_institutions_type ON financial_institutions(type);
CREATE INDEX IF NOT EXISTS idx_financial_institutions_active ON financial_institutions(is_active) WHERE is_active = true;

-- Insertion des établissements par défaut (Cameroun)
INSERT INTO financial_institutions (code, name, type, swift_code) VALUES
('SGBC', 'Société Générale Cameroun', 'BANK', 'SGLRCMCX'),
('BICEC', 'BICEC', 'BANK', 'BICECMCX'),
('AFRILAND', 'Afriland First Bank', 'BANK', 'CCBACMCX'),
('UBA', 'United Bank for Africa', 'BANK', 'UNAFCMCX'),
('ECOBANK', 'Ecobank Cameroun', 'BANK', 'ECOCCMCX'),
('SCB', 'Standard Chartered Bank', 'BANK', 'SCBLCMCX'),
('CCA', 'Crédit Communautaire d''Afrique', 'BANK', NULL),
('ORANGE_MONEY', 'Orange Money', 'MOBILE_MONEY', NULL),
('MTN_MOMO', 'MTN Mobile Money', 'MOBILE_MONEY', NULL)
ON CONFLICT (code) DO NOTHING;

-- Commentaires
COMMENT ON TABLE financial_institutions IS 'Catalogue des établissements financiers (banques, mobile money)';
COMMENT ON COLUMN financial_institutions.code IS 'Code unique de l''établissement';
COMMENT ON COLUMN financial_institutions.type IS 'Type: BANK, MOBILE_MONEY, OTHER';
COMMENT ON COLUMN financial_institutions.swift_code IS 'Code SWIFT/BIC pour les virements internationaux';

COMMIT;
