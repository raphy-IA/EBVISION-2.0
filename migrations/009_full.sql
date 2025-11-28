-- ============================================
-- NETTOYAGE PRÉALABLE (DEV ONLY)
-- ============================================

DROP TABLE IF EXISTS evaluation_comments CASCADE;
DROP TABLE IF EXISTS evaluation_objective_scores CASCADE;
DROP TABLE IF EXISTS evaluations CASCADE;
DROP TABLE IF EXISTS evaluation_campaigns CASCADE;
DROP TABLE IF EXISTS evaluation_templates CASCADE;
DROP TABLE IF EXISTS objective_progress CASCADE;
DROP TABLE IF EXISTS individual_objectives CASCADE;
DROP TABLE IF EXISTS division_objectives CASCADE;
DROP TABLE IF EXISTS business_unit_objectives CASCADE;
DROP TABLE IF EXISTS global_objectives CASCADE;
DROP TABLE IF EXISTS objective_types CASCADE;

-- Suppression des vues
DROP VIEW IF EXISTS v_evaluation_statistics CASCADE;
DROP VIEW IF EXISTS v_objectives_hierarchy CASCADE;

-- Suppression des fonctions et triggers
DROP FUNCTION IF EXISTS calculate_evaluation_score_rate() CASCADE;
DROP FUNCTION IF EXISTS calculate_objective_progress_rate() CASCADE;
DROP FUNCTION IF EXISTS update_evaluation_global_score() CASCADE;
DROP FUNCTION IF EXISTS calculate_evaluation_score(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS calculate_global_budget(UUID) CASCADE;
DROP FUNCTION IF EXISTS calculate_global_budget(INTEGER) CASCADE; -- Au cas où l'ancienne version existe

-- ============================================
-- Migration 009: Refonte du système d'objectifs et ajout du module d'évaluation
-- ============================================
-- ============================================
-- Migration 009: Refonte du système d'objectifs et ajout du module d'évaluation
-- ============================================

-- ============================================
-- PARTIE 1: TYPES D'OBJECTIFS
-- ============================================

-- Table des types d'objectifs configurables
CREATE TABLE IF NOT EXISTS objective_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'FINANCIAL', 'OPERATIONAL', 'COMMERCIAL', 'QUALITY', 'HR'
    unit VARCHAR(20) DEFAULT '', -- '€', '%', 'nombre', 'heures'
    is_financial BOOLEAN DEFAULT FALSE, -- Pour le calcul du budget global
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PARTIE 2: OBJECTIFS HIÉRARCHIQUES
-- ============================================

-- Objectifs globaux (fixés par les Senior Partners)
CREATE TABLE IF NOT EXISTS global_objectives (
    id SERIAL PRIMARY KEY,
    fiscal_year_id UUID REFERENCES fiscal_years(id) ON DELETE CASCADE,
    objective_type_id INTEGER REFERENCES objective_types(id),
    target_value DECIMAL(15, 2) NOT NULL,
    description TEXT,
    weight DECIMAL(5, 2) DEFAULT 1.00, -- Poids pour le calcul du score global
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fiscal_year_id, objective_type_id)
);

-- Objectifs par Business Unit
CREATE TABLE IF NOT EXISTS business_unit_objectives (
    id SERIAL PRIMARY KEY,
    global_objective_id INTEGER REFERENCES global_objectives(id) ON DELETE CASCADE,
    business_unit_id UUID REFERENCES business_units(id) ON DELETE CASCADE,
    target_value DECIMAL(15, 2) NOT NULL,
    description TEXT,
    weight DECIMAL(5, 2) DEFAULT 1.00,
    assigned_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(global_objective_id, business_unit_id)
);

-- Objectifs par Division
CREATE TABLE IF NOT EXISTS division_objectives (
    id SERIAL PRIMARY KEY,
    business_unit_objective_id INTEGER REFERENCES business_unit_objectives(id) ON DELETE CASCADE,
    division_id UUID REFERENCES divisions(id) ON DELETE CASCADE,
    target_value DECIMAL(15, 2) NOT NULL,
    description TEXT,
    weight DECIMAL(5, 2) DEFAULT 1.00,
    assigned_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(business_unit_objective_id, division_id)
);

-- Objectifs individuels (par collaborateur)
CREATE TABLE IF NOT EXISTS individual_objectives (
    id SERIAL PRIMARY KEY,
    division_objective_id INTEGER REFERENCES division_objectives(id) ON DELETE CASCADE,
    collaborator_id UUID REFERENCES collaborateurs(id) ON DELETE CASCADE,
    target_value DECIMAL(15, 2) NOT NULL,
    description TEXT,
    weight DECIMAL(5, 2) DEFAULT 1.00,
    assigned_by UUID REFERENCES users(id),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Suivi de la progression des objectifs
CREATE TABLE IF NOT EXISTS objective_progress (
    id SERIAL PRIMARY KEY,
    objective_type VARCHAR(50) NOT NULL, -- 'GLOBAL', 'BUSINESS_UNIT', 'DIVISION', 'INDIVIDUAL'
    objective_id INTEGER NOT NULL,
    current_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
    target_value DECIMAL(15, 2) NOT NULL,
    achievement_rate DECIMAL(5, 2) DEFAULT 0,
    measured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_objective_progress_type_id ON objective_progress(objective_type, objective_id);
CREATE INDEX IF NOT EXISTS idx_global_objectives_fiscal_year ON global_objectives(fiscal_year_id);
CREATE INDEX IF NOT EXISTS idx_bu_objectives_global ON business_unit_objectives(global_objective_id);
CREATE INDEX IF NOT EXISTS idx_division_objectives_bu ON division_objectives(business_unit_objective_id);
CREATE INDEX IF NOT EXISTS idx_individual_objectives_division ON individual_objectives(division_objective_id);
CREATE INDEX IF NOT EXISTS idx_individual_objectives_collaborator ON individual_objectives(collaborator_id);

-- ============================================
-- PARTIE 3: MODULE D'ÉVALUATION
-- ============================================

-- Modèles d'évaluation
CREATE TABLE IF NOT EXISTS evaluation_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    scoring_method VARCHAR(50) DEFAULT 'SIMPLE_AVERAGE', -- 'SIMPLE_AVERAGE', 'WEIGHTED_AVERAGE', 'BY_CATEGORY'
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Campagnes d'évaluation (2-3 par an)
CREATE TABLE IF NOT EXISTS evaluation_campaigns (
    id SERIAL PRIMARY KEY,
    fiscal_year_id UUID REFERENCES fiscal_years(id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES evaluation_templates(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT', -- 'DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'
    target_type VARCHAR(50), -- 'ALL', 'BUSINESS_UNIT', 'DIVISION', 'INDIVIDUAL'
    target_id UUID, -- ID de la BU, Division ou NULL pour ALL
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Évaluations individuelles
CREATE TABLE IF NOT EXISTS evaluations (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES evaluation_campaigns(id) ON DELETE CASCADE,
    collaborator_id UUID REFERENCES collaborateurs(id) ON DELETE CASCADE,
    evaluator_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'DRAFT', -- 'DRAFT', 'SUBMITTED', 'VALIDATED', 'SIGNED'
    global_score DECIMAL(5, 2),
    strengths TEXT,
    improvement_areas TEXT,
    general_comment TEXT,
    next_period_objectives TEXT,
    evaluator_signature_date TIMESTAMP WITH TIME ZONE,
    collaborator_signature_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, collaborator_id)
);

-- Scores par objectif dans une évaluation
CREATE TABLE IF NOT EXISTS evaluation_objective_scores (
    id SERIAL PRIMARY KEY,
    evaluation_id INTEGER REFERENCES evaluations(id) ON DELETE CASCADE,
    individual_objective_id INTEGER REFERENCES individual_objectives(id),
    target_value DECIMAL(15, 2) NOT NULL,
    achieved_value DECIMAL(15, 2) NOT NULL,
    achievement_rate DECIMAL(5, 2) DEFAULT 0,
    rating VARCHAR(50), -- 'EXCEEDED', 'ACHIEVED', 'PARTIALLY_ACHIEVED', 'NOT_ACHIEVED'
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Commentaires et feedback des évaluations
CREATE TABLE IF NOT EXISTS evaluation_comments (
    id SERIAL PRIMARY KEY,
    evaluation_id INTEGER REFERENCES evaluations(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id),
    comment_type VARCHAR(50), -- 'STRENGTH', 'IMPROVEMENT', 'GENERAL', 'OBJECTIVE_SPECIFIC'
    objective_score_id INTEGER REFERENCES evaluation_objective_scores(id),
    content TEXT NOT NULL,
    is_visible_to_collaborator BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour le module d'évaluation
CREATE INDEX IF NOT EXISTS idx_evaluations_campaign ON evaluations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_collaborator ON evaluations(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator ON evaluations(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_scores_evaluation ON evaluation_objective_scores(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_comments_evaluation ON evaluation_comments(evaluation_id);

-- ============================================
-- PARTIE 4: MODIFICATION DE LA TABLE FISCAL_YEARS
-- ============================================

-- Rendre le champ budget_global nullable (sera calculé automatiquement)
ALTER TABLE fiscal_years ALTER COLUMN budget_global DROP NOT NULL;

-- Ajouter un commentaire pour indiquer que c'est un champ calculé
COMMENT ON COLUMN fiscal_years.budget_global IS 'Budget global calculé automatiquement à partir des objectifs financiers';

-- ============================================
-- PARTIE 5: MIGRATION DES DONNÉES EXISTANTES
-- ============================================

-- Migrer les données de strategic_objectives vers global_objectives
-- Note: Cette migration suppose que les données existantes sont des objectifs globaux

-- D'abord, s'assurer que les types d'objectifs existent
INSERT INTO objective_types (code, label, category, unit, is_financial, description) VALUES
    ('CA', 'Chiffre d''affaires', 'FINANCIAL', '€', TRUE, 'Objectif de chiffre d''affaires'),
    ('MARGE', 'Marge brute', 'FINANCIAL', '%', TRUE, 'Objectif de marge brute'),
    ('SATISFACTION', 'Satisfaction client', 'QUALITY', '%', FALSE, 'Taux de satisfaction client'),
    ('CONVERSION', 'Taux de conversion', 'COMMERCIAL', '%', FALSE, 'Taux de conversion des opportunités')
ON CONFLICT (code) DO NOTHING;

-- Migrer les objectifs existants si la table strategic_objectives existe
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'strategic_objectives') THEN
        -- Insérer les objectifs globaux depuis strategic_objectives
        INSERT INTO global_objectives (fiscal_year_id, objective_type_id, target_value, created_at, updated_at)
        SELECT 
            (SELECT id FROM fiscal_years WHERE annee = so.year LIMIT 1) as fiscal_year_id,
            ot.id as objective_type_id,
            so.target_value,
            so.created_at,
            so.updated_at
        FROM strategic_objectives so
        JOIN objective_types ot ON ot.code = so.type
        WHERE so.business_unit_id IS NULL -- Seulement les objectifs globaux
        ON CONFLICT (fiscal_year_id, objective_type_id) DO NOTHING;
        
        RAISE NOTICE 'Migration des objectifs existants terminée';
    END IF;
END $$;

-- ============================================
-- PARTIE 6: INSERTION DES TYPES D'OBJECTIFS PAR DÉFAUT
-- ============================================

INSERT INTO objective_types (code, label, category, unit, is_financial, description) VALUES
    -- Objectifs financiers
    ('RENTABILITE', 'Taux de rentabilité', 'FINANCIAL', '%', TRUE, 'Taux de rentabilité global'),
    ('RECOUVREMENT', 'Taux de recouvrement', 'FINANCIAL', '%', TRUE, 'Taux de recouvrement des créances'),
    
    -- Objectifs opérationnels
    ('HEURES_CHARGEABLES', 'Heures chargeables', 'OPERATIONAL', 'heures', FALSE, 'Nombre d''heures chargeables'),
    ('TAUX_CHARGEABILITE', 'Taux de chargeabilité', 'OPERATIONAL', '%', FALSE, 'Taux de chargeabilité des collaborateurs'),
    ('MISSIONS_COMPLETEES', 'Missions complétées', 'OPERATIONAL', 'nombre', FALSE, 'Nombre de missions complétées'),
    ('DELAI_MOYEN', 'Délai moyen de livraison', 'OPERATIONAL', 'jours', FALSE, 'Délai moyen de livraison des missions'),
    
    -- Objectifs commerciaux
    ('NOUVEAUX_CLIENTS', 'Nouveaux clients', 'COMMERCIAL', 'nombre', FALSE, 'Nombre de nouveaux clients acquis'),
    ('OPPORTUNITES', 'Opportunités créées', 'COMMERCIAL', 'nombre', FALSE, 'Nombre d''opportunités créées'),
    ('PROSPECTION', 'Campagnes de prospection', 'COMMERCIAL', 'nombre', FALSE, 'Nombre de campagnes de prospection menées'),
    
    -- Objectifs qualité
    ('NPS', 'Net Promoter Score', 'QUALITY', 'score', FALSE, 'Net Promoter Score'),
    ('QUALITE', 'Score qualité interne', 'QUALITY', '%', FALSE, 'Score qualité interne'),
    
    -- Objectifs RH
    ('FORMATION', 'Heures de formation', 'HR', 'heures', FALSE, 'Nombre d''heures de formation'),
    ('RETENTION', 'Taux de rétention', 'HR', '%', FALSE, 'Taux de rétention des collaborateurs'),
    ('RECRUTEMENT', 'Recrutements', 'HR', 'nombre', FALSE, 'Nombre de recrutements réalisés')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- PARTIE 7: INSERTION D'UN MODÈLE D'ÉVALUATION PAR DÉFAUT
-- ============================================

INSERT INTO evaluation_templates (name, description, scoring_method, is_active) VALUES
    ('Évaluation Standard', 'Modèle d''évaluation standard basé sur les objectifs assignés', 'WEIGHTED_AVERAGE', TRUE),
    ('Évaluation Simplifiée', 'Modèle d''évaluation simplifiée avec moyenne simple', 'SIMPLE_AVERAGE', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================
-- PARTIE 8: FONCTIONS UTILITAIRES
-- ============================================

-- Fonction pour calculer le budget global à partir des objectifs financiers
CREATE OR REPLACE FUNCTION calculate_global_budget(p_fiscal_year_id UUID)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
    v_total_budget DECIMAL(15, 2);
BEGIN
    SELECT COALESCE(SUM(go.target_value), 0)
    INTO v_total_budget
    FROM global_objectives go
    JOIN objective_types ot ON go.objective_type_id = ot.id
    WHERE go.fiscal_year_id = p_fiscal_year_id
    AND ot.is_financial = TRUE
    AND ot.code = 'CA'; -- Seulement le CA pour le budget global
    
    RETURN v_total_budget;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer le score global d'une évaluation
CREATE OR REPLACE FUNCTION calculate_evaluation_score(p_evaluation_id INTEGER)
RETURNS DECIMAL(5, 2) AS $$
DECLARE
    v_score DECIMAL(5, 2);
    v_scoring_method VARCHAR(50);
BEGIN
    -- Récupérer la méthode de scoring
    SELECT et.scoring_method
    INTO v_scoring_method
    FROM evaluations e
    JOIN evaluation_campaigns ec ON e.campaign_id = ec.id
    JOIN evaluation_templates et ON ec.template_id = et.id
    WHERE e.id = p_evaluation_id;
    
    -- Calculer selon la méthode
    IF v_scoring_method = 'SIMPLE_AVERAGE' THEN
        SELECT AVG(achievement_rate)
        INTO v_score
        FROM evaluation_objective_scores
        WHERE evaluation_id = p_evaluation_id;
    ELSIF v_scoring_method = 'WEIGHTED_AVERAGE' THEN
        SELECT SUM(eos.achievement_rate * io.weight) / SUM(io.weight)
        INTO v_score
        FROM evaluation_objective_scores eos
        JOIN individual_objectives io ON eos.individual_objective_id = io.id
        WHERE eos.evaluation_id = p_evaluation_id;
    ELSE
        -- Par défaut, moyenne simple
        SELECT AVG(achievement_rate)
        INTO v_score
        FROM evaluation_objective_scores
        WHERE evaluation_id = p_evaluation_id;
    END IF;
    
    RETURN COALESCE(v_score, 0);
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement le score global d'une évaluation
CREATE OR REPLACE FUNCTION update_evaluation_global_score()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE evaluations
    SET global_score = calculate_evaluation_score(NEW.evaluation_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.evaluation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_evaluation_score
AFTER INSERT OR UPDATE ON evaluation_objective_scores
FOR EACH ROW
EXECUTE FUNCTION update_evaluation_global_score();

-- Trigger pour calculer automatiquement le taux d'atteinte dans objective_progress
CREATE OR REPLACE FUNCTION calculate_objective_progress_rate()
RETURNS TRIGGER AS $$
BEGIN
    NEW.achievement_rate := CASE 
        WHEN NEW.target_value > 0 THEN (NEW.current_value / NEW.target_value * 100)
        ELSE 0
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_objective_progress_rate
BEFORE INSERT OR UPDATE ON objective_progress
FOR EACH ROW
EXECUTE FUNCTION calculate_objective_progress_rate();

-- Trigger pour calculer automatiquement le taux d'atteinte dans evaluation_objective_scores
CREATE OR REPLACE FUNCTION calculate_evaluation_score_rate()
RETURNS TRIGGER AS $$
BEGIN
    NEW.achievement_rate := CASE 
        WHEN NEW.target_value > 0 THEN (NEW.achieved_value / NEW.target_value * 100)
        ELSE 0
    END;
    
    -- Déterminer automatiquement le rating
    IF NEW.achievement_rate >= 120 THEN
        NEW.rating := 'EXCEEDED';
    ELSIF NEW.achievement_rate >= 100 THEN
        NEW.rating := 'ACHIEVED';
    ELSIF NEW.achievement_rate >= 70 THEN
        NEW.rating := 'PARTIALLY_ACHIEVED';
    ELSE
        NEW.rating := 'NOT_ACHIEVED';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_evaluation_score_rate
BEFORE INSERT OR UPDATE ON evaluation_objective_scores
FOR EACH ROW
EXECUTE FUNCTION calculate_evaluation_score_rate();

-- ============================================
-- PARTIE 9: VUES UTILES
-- ============================================

-- Vue pour obtenir la hiérarchie complète des objectifs
CREATE OR REPLACE VIEW v_objectives_hierarchy AS
SELECT 
    'GLOBAL' as level,
    go.id,
    go.fiscal_year_id,
    fy.annee as fiscal_year,
    ot.code as objective_type_code,
    ot.label as objective_type_label,
    go.target_value,
    ot.unit,
    NULL::UUID as business_unit_id,
    NULL::VARCHAR as business_unit_name,
    NULL::UUID as division_id,
    NULL::VARCHAR as division_name,
    NULL::UUID as collaborator_id,
    NULL::VARCHAR as collaborator_name
FROM global_objectives go
JOIN fiscal_years fy ON go.fiscal_year_id = fy.id
JOIN objective_types ot ON go.objective_type_id = ot.id

UNION ALL

SELECT 
    'BUSINESS_UNIT' as level,
    buo.id,
    go.fiscal_year_id,
    fy.annee as fiscal_year,
    ot.code as objective_type_code,
    ot.label as objective_type_label,
    buo.target_value,
    ot.unit,
    buo.business_unit_id,
    bu.nom as business_unit_name,
    NULL::UUID as division_id,
    NULL::VARCHAR as division_name,
    NULL::UUID as collaborator_id,
    NULL::VARCHAR as collaborator_name
FROM business_unit_objectives buo
JOIN global_objectives go ON buo.global_objective_id = go.id
JOIN fiscal_years fy ON go.fiscal_year_id = fy.id
JOIN objective_types ot ON go.objective_type_id = ot.id
JOIN business_units bu ON buo.business_unit_id = bu.id

UNION ALL

SELECT 
    'DIVISION' as level,
    dobj.id,
    go.fiscal_year_id,
    fy.annee as fiscal_year,
    ot.code as objective_type_code,
    ot.label as objective_type_label,
    dobj.target_value,
    ot.unit,
    buo.business_unit_id,
    bu.nom as business_unit_name,
    dobj.division_id,
    d.nom as division_name,
    NULL::UUID as collaborator_id,
    NULL::VARCHAR as collaborator_name
FROM division_objectives dobj
JOIN business_unit_objectives buo ON dobj.business_unit_objective_id = buo.id
JOIN global_objectives go ON buo.global_objective_id = go.id
JOIN fiscal_years fy ON go.fiscal_year_id = fy.id
JOIN objective_types ot ON go.objective_type_id = ot.id
JOIN business_units bu ON buo.business_unit_id = bu.id
JOIN divisions d ON dobj.division_id = d.id

UNION ALL

SELECT 
    'INDIVIDUAL' as level,
    io.id,
    go.fiscal_year_id,
    fy.annee as fiscal_year,
    ot.code as objective_type_code,
    ot.label as objective_type_label,
    io.target_value,
    ot.unit,
    buo.business_unit_id,
    bu.nom as business_unit_name,
    dobj.division_id,
    d.nom as division_name,
    io.collaborator_id,
    CONCAT(c.prenom, ' ', c.nom) as collaborator_name
FROM individual_objectives io
JOIN division_objectives dobj ON io.division_objective_id = dobj.id
JOIN business_unit_objectives buo ON dobj.business_unit_objective_id = buo.id
JOIN global_objectives go ON buo.global_objective_id = go.id
JOIN fiscal_years fy ON go.fiscal_year_id = fy.id
JOIN objective_types ot ON go.objective_type_id = ot.id
JOIN business_units bu ON buo.business_unit_id = bu.id
JOIN divisions d ON dobj.division_id = d.id
JOIN collaborateurs c ON io.collaborator_id = c.id;

-- Vue pour les statistiques d'évaluation
CREATE OR REPLACE VIEW v_evaluation_statistics AS
SELECT 
    ec.id as campaign_id,
    ec.name as campaign_name,
    ec.fiscal_year_id,
    fy.annee as fiscal_year,
    COUNT(e.id) as total_evaluations,
    COUNT(CASE WHEN e.status = 'VALIDATED' THEN 1 END) as completed_evaluations,
    COUNT(CASE WHEN e.status = 'DRAFT' THEN 1 END) as draft_evaluations,
    AVG(e.global_score) as average_score,
    MIN(e.global_score) as min_score,
    MAX(e.global_score) as max_score
FROM evaluation_campaigns ec
JOIN fiscal_years fy ON ec.fiscal_year_id = fy.id
LEFT JOIN evaluations e ON ec.id = e.campaign_id
GROUP BY ec.id, ec.name, ec.fiscal_year_id, fy.annee;

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================

-- Log de fin
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 009 terminée avec succès';
    RAISE NOTICE '📊 Tables créées: objective_types, global_objectives, business_unit_objectives, division_objectives, individual_objectives, objective_progress';
    RAISE NOTICE '📋 Tables d''évaluation créées: evaluation_templates, evaluation_campaigns, evaluations, evaluation_objective_scores, evaluation_comments';
    RAISE NOTICE '🔧 Fonctions créées: calculate_global_budget, calculate_evaluation_score';
    RAISE NOTICE '👁️ Vues créées: v_objectives_hierarchy, v_evaluation_statistics';
END $$;

