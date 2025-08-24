-- Migration 064: Ajouter le champ responsible_id aux campagnes de prospection
-- Date: 2025-08-21
-- Description: Ajoute le champ pour définir le responsable de chaque campagne

-- Ajouter le champ responsible_id à la table prospecting_campaigns
ALTER TABLE prospecting_campaigns ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL;

-- Index pour les responsables de campagnes
CREATE INDEX IF NOT EXISTS idx_prospecting_campaigns_responsible ON prospecting_campaigns(responsible_id);

-- Commentaire
COMMENT ON COLUMN prospecting_campaigns.responsible_id IS 'Responsable de la campagne de prospection';

