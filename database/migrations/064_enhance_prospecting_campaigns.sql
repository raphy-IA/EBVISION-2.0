-- Migration pour améliorer le système de campagnes de prospection
-- Ajout des colonnes nécessaires pour le processus complet de validation et exécution

-- 1. Ajouter les colonnes manquantes à prospecting_campaign_companies
ALTER TABLE prospecting_campaign_companies 
ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) DEFAULT 'PENDING' 
CHECK (validation_status IN ('PENDING', 'APPROVED', 'REJECTED'));

ALTER TABLE prospecting_campaign_companies 
ADD COLUMN IF NOT EXISTS execution_status VARCHAR(20) DEFAULT 'pending_execution' 
CHECK (execution_status IN ('pending_execution', 'deposed', 'sent', 'failed'));

ALTER TABLE prospecting_campaign_companies 
ADD COLUMN IF NOT EXISTS converted_to_opportunity BOOLEAN DEFAULT FALSE;

ALTER TABLE prospecting_campaign_companies 
ADD COLUMN IF NOT EXISTS opportunity_id UUID;

ALTER TABLE prospecting_campaign_companies 
ADD COLUMN IF NOT EXISTS execution_date TIMESTAMPTZ;

ALTER TABLE prospecting_campaign_companies 
ADD COLUMN IF NOT EXISTS execution_notes TEXT;

-- 2. Ajouter des index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_pcc_validation_status ON prospecting_campaign_companies(validation_status);
CREATE INDEX IF NOT EXISTS idx_pcc_execution_status ON prospecting_campaign_companies(execution_status);
CREATE INDEX IF NOT EXISTS idx_pcc_converted ON prospecting_campaign_companies(converted_to_opportunity);
CREATE INDEX IF NOT EXISTS idx_pcc_opportunity ON prospecting_campaign_companies(opportunity_id);

-- 3. Ajouter des commentaires pour documenter les nouvelles colonnes
COMMENT ON COLUMN prospecting_campaign_companies.validation_status IS 'Statut de validation de l''entreprise dans la campagne: PENDING, APPROVED, REJECTED';
COMMENT ON COLUMN prospecting_campaign_companies.execution_status IS 'Statut d''exécution: pending_execution, deposed (courrier), sent (email), failed';
COMMENT ON COLUMN prospecting_campaign_companies.converted_to_opportunity IS 'Indique si cette entreprise a été convertie en opportunité';
COMMENT ON COLUMN prospecting_campaign_companies.opportunity_id IS 'ID de l''opportunité créée à partir de cette campagne';
COMMENT ON COLUMN prospecting_campaign_companies.execution_date IS 'Date d''exécution (dépôt ou envoi)';
COMMENT ON COLUMN prospecting_campaign_companies.execution_notes IS 'Notes sur l''exécution (échec, remarques, etc.)';

-- 4. Mettre à jour les données existantes pour avoir des valeurs cohérentes
UPDATE prospecting_campaign_companies 
SET validation_status = 'APPROVED' 
WHERE validation_status = 'PENDING' 
AND campaign_id IN (
    SELECT id FROM prospecting_campaigns 
    WHERE validation_statut = 'VALIDE'
);

-- 5. Ajouter une contrainte pour s'assurer qu'une opportunité ne peut être créée que sur des entreprises exécutées
ALTER TABLE prospecting_campaign_companies 
ADD CONSTRAINT check_opportunity_execution 
CHECK (
    (converted_to_opportunity = FALSE) OR 
    (converted_to_opportunity = TRUE AND execution_status IN ('deposed', 'sent'))
);

-- 6. Créer une vue pour faciliter les rapports
CREATE OR REPLACE VIEW prospecting_campaign_summary AS
SELECT 
    pc.id as campaign_id,
    pc.name as campaign_name,
    pc.validation_statut as campaign_validation_status,
    pt.type_courrier as template_type,
    bu.nom as business_unit_name,
    d.nom as division_name,
    resp.nom as responsible_name,
    resp.prenom as responsible_prenom,
    COUNT(pcc.company_id) as total_companies,
    COUNT(CASE WHEN pcc.validation_status = 'APPROVED' THEN 1 END) as approved_companies,
    COUNT(CASE WHEN pcc.validation_status = 'REJECTED' THEN 1 END) as rejected_companies,
    COUNT(CASE WHEN pcc.execution_status = 'deposed' THEN 1 END) as deposed_count,
    COUNT(CASE WHEN pcc.execution_status = 'sent' THEN 1 END) as sent_count,
    COUNT(CASE WHEN pcc.execution_status = 'pending_execution' THEN 1 END) as pending_execution_count,
    COUNT(CASE WHEN pcc.converted_to_opportunity = TRUE THEN 1 END) as converted_count,
    pc.created_at,
    pc.scheduled_date
FROM prospecting_campaigns pc
LEFT JOIN prospecting_templates pt ON pc.template_id = pt.id
LEFT JOIN business_units bu ON pt.business_unit_id = bu.id
LEFT JOIN divisions d ON pt.division_id = d.id
LEFT JOIN collaborateurs resp ON pc.responsible_id = resp.id
LEFT JOIN prospecting_campaign_companies pcc ON pc.id = pcc.campaign_id
GROUP BY pc.id, pc.name, pc.validation_statut, pt.type_courrier, bu.nom, d.nom, resp.nom, resp.prenom, pc.created_at, pc.scheduled_date;

-- 7. Ajouter des commentaires sur la vue
COMMENT ON VIEW prospecting_campaign_summary IS 'Vue pour les rapports de campagnes de prospection avec métriques d''exécution et conversion';
