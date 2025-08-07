-- Migration pour créer la table des superviseurs de feuilles de temps
-- et ajouter le champ status aux feuilles de temps

-- Ajouter le champ status à la table time_sheets
ALTER TABLE time_sheets ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';
-- Status possibles: 'draft', 'submitted', 'approved', 'rejected'

-- Créer la table des superviseurs de feuilles de temps
CREATE TABLE IF NOT EXISTS time_sheet_supervisors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaborateur_id UUID NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
    supervisor_id UUID NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(collaborateur_id, supervisor_id)
);

-- Créer la table des historiques de validation
CREATE TABLE IF NOT EXISTS time_sheet_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time_sheet_id UUID NOT NULL REFERENCES time_sheets(id) ON DELETE CASCADE,
    supervisor_id UUID NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL, -- 'approve' ou 'reject'
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_time_sheet_supervisors_collaborateur ON time_sheet_supervisors(collaborateur_id);
CREATE INDEX IF NOT EXISTS idx_time_sheet_supervisors_supervisor ON time_sheet_supervisors(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_time_sheet_approvals_time_sheet ON time_sheet_approvals(time_sheet_id);
CREATE INDEX IF NOT EXISTS idx_time_sheet_approvals_supervisor ON time_sheet_approvals(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_time_sheets_status ON time_sheets(status); 