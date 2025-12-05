-- Migration 016: Extension de la table invoices pour le workflow de validation
-- Date: 2025-12-05
-- Description: Ajoute les colonnes nécessaires pour le workflow de validation multi-niveaux

BEGIN;

-- Ajouter les colonnes pour le workflow (en évitant les doublons)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(30) DEFAULT 'BROUILLON',
ADD COLUMN IF NOT EXISTS submitted_for_validation_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS submitted_for_validation_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS validation_notes TEXT,
ADD COLUMN IF NOT EXISTS submitted_for_emission_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS emission_validated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS emission_validated_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS emission_validation_notes TEXT,
ADD COLUMN IF NOT EXISTS emitted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS emitted_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id);

-- Contrainte de statut workflow
ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS check_workflow_status;

ALTER TABLE invoices
ADD CONSTRAINT check_workflow_status CHECK (
    workflow_status IN (
        'BROUILLON',
        'SOUMISE_VALIDATION',
        'VALIDEE',
        'SOUMISE_EMISSION',
        'VALIDEE_EMISSION',
        'EMISE',
        'PAYEE_PARTIELLEMENT',
        'PAYEE',
        'ANNULEE'
    )
);

-- Mettre à jour les factures existantes
-- Mapper l'ancien statut vers le nouveau workflow_status
UPDATE invoices
SET workflow_status = CASE
    WHEN statut = 'BROUILLON' THEN 'BROUILLON'
    WHEN statut = 'EMISE' THEN 'EMISE'
    WHEN statut = 'PAYEE' THEN 'PAYEE'
    WHEN statut = 'ANNULEE' THEN 'ANNULEE'
    ELSE 'BROUILLON'
END
WHERE workflow_status = 'BROUILLON';

-- Mettre à jour le statut de paiement basé sur montant_paye
UPDATE invoices
SET workflow_status = CASE
    WHEN montant_paye >= montant_ttc THEN 'PAYEE'
    WHEN montant_paye > 0 AND montant_paye < montant_ttc THEN 'PAYEE_PARTIELLEMENT'
    ELSE workflow_status
END
WHERE workflow_status = 'EMISE' AND montant_paye IS NOT NULL AND montant_paye > 0;

-- Index pour les requêtes de validation
CREATE INDEX IF NOT EXISTS idx_invoices_workflow_status ON invoices(workflow_status);
CREATE INDEX IF NOT EXISTS idx_invoices_validated_by ON invoices(validated_by);
CREATE INDEX IF NOT EXISTS idx_invoices_emission_validated_by ON invoices(emission_validated_by);
CREATE INDEX IF NOT EXISTS idx_invoices_submitted_validation ON invoices(submitted_for_validation_at);
CREATE INDEX IF NOT EXISTS idx_invoices_submitted_emission ON invoices(submitted_for_emission_at);

-- Commentaires
COMMENT ON COLUMN invoices.workflow_status IS 'Nouveau statut dans le workflow de validation (remplace progressivement statut)';
COMMENT ON COLUMN invoices.statut IS 'Ancien statut (conservé pour compatibilité)';
COMMENT ON COLUMN invoices.validated_by IS 'Associé ou Responsable BU qui a validé';
COMMENT ON COLUMN invoices.emission_validated_by IS 'Senior Partner qui a validé pour émission';
COMMENT ON COLUMN invoices.montant_paye IS 'Montant total payé (mis à jour automatiquement via payment_allocations)';
COMMENT ON COLUMN invoices.montant_restant IS 'Montant restant à payer (calculé automatiquement)';
COMMENT ON COLUMN invoices.submitted_for_validation_at IS 'Date de soumission pour validation';
COMMENT ON COLUMN invoices.submitted_for_emission_at IS 'Date de soumission pour émission';
COMMENT ON COLUMN invoices.emitted_at IS 'Date d''émission de la facture';
COMMENT ON COLUMN invoices.rejection_reason IS 'Raison du rejet de la facture';

COMMIT;
