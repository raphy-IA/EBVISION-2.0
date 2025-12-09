-- Drop the old constraint
ALTER TABLE prospecting_campaign_validations
DROP CONSTRAINT IF EXISTS prospecting_campaign_validations_statut_validation_check;

-- Add the new constraint with 'RESOLU_AUTRE'
ALTER TABLE prospecting_campaign_validations
ADD CONSTRAINT prospecting_campaign_validations_statut_validation_check
CHECK (statut_validation IN ('EN_ATTENTE', 'APPROUVE', 'REFUSE', 'RESOLU_AUTRE'));
