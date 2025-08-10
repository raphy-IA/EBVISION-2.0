-- Phase 2 Workflow Unifié - Tables et colonnes additionnelles (adapté à l'existant)
-- NOTE: On s'appuie sur les templates existants: opportunity_stage_templates (stage "définition")
--       et les instances: opportunity_stages (étapes d'une opportunité)

BEGIN;

-- 1) Exigences par template d'étape (actions/documents requis)
CREATE TABLE IF NOT EXISTS stage_required_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_template_id UUID NOT NULL REFERENCES opportunity_stage_templates(id) ON DELETE CASCADE,
  action_type VARCHAR(120) NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  validation_order INTEGER DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sra_template ON stage_required_actions(stage_template_id);

CREATE TABLE IF NOT EXISTS stage_required_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_template_id UUID NOT NULL REFERENCES opportunity_stage_templates(id) ON DELETE CASCADE,
  document_type VARCHAR(120) NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_srd_template ON stage_required_documents(stage_template_id);

-- 2) Actions et documents au niveau opportunité (rattachement possible à l'étape instance)
CREATE TABLE IF NOT EXISTS opportunity_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES opportunity_stages(id) ON DELETE SET NULL,
  action_type VARCHAR(120) NOT NULL,
  description TEXT,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  performed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_validating BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oa_opp ON opportunity_actions(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_oa_stage ON opportunity_actions(stage_id);

CREATE TABLE IF NOT EXISTS opportunity_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES opportunity_stages(id) ON DELETE SET NULL,
  document_type VARCHAR(120) NOT NULL,
  file_name VARCHAR(255),
  file_path VARCHAR(1024),
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  validation_status VARCHAR(16) NOT NULL DEFAULT 'pending', -- pending|validated|rejected
  validator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  validated_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_od_opp ON opportunity_documents(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_od_stage ON opportunity_documents(stage_id);

-- 3) Colonnes additionnelles sur opportunities
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS current_stage_id UUID REFERENCES opportunity_stages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS next_alert_date TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS auto_abandon_date TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS stage_validation_status JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP NULL;

-- 4) Backfill minimal: current_stage_id et stage_entered_at à partir de l'étape IN_PROGRESS si unique
WITH current AS (
  SELECT o.id AS opportunity_id, os.id AS stage_id, os.start_date
  FROM opportunities o
  JOIN opportunity_stages os ON os.opportunity_id = o.id
  WHERE os.status = 'IN_PROGRESS'
)
UPDATE opportunities o
SET current_stage_id = c.stage_id,
    stage_entered_at = COALESCE(c.start_date, o.stage_entered_at),
    last_activity_at = COALESCE(c.start_date, o.last_activity_at)
FROM current c
WHERE o.id = c.opportunity_id
  AND (o.current_stage_id IS NULL OR o.current_stage_id <> c.stage_id);

COMMIT;


