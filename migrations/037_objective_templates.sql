-- ============================================
-- Migration 037: Bibliothèque de Templates d'Objectifs Stratégiques
-- ============================================

BEGIN;

-- ============================================================
-- PARTIE 1 : CRÉER LES TABLES
-- ============================================================

-- Requêtes SQL de calcul automatique des métriques (référencé par code, pas FK)
CREATE TABLE IF NOT EXISTS objective_metric_compute_queries (
    id          SERIAL PRIMARY KEY,
    metric_code VARCHAR(100) NOT NULL,   -- réf. objective_metrics.code
    scope       VARCHAR(50)  NOT NULL DEFAULT 'GLOBAL', -- GLOBAL, BU, DIVISION, INDIVIDUAL
    compute_sql TEXT         NOT NULL,
    description TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(metric_code, scope)
);

-- Templates d'objectifs stratégiques
CREATE TABLE IF NOT EXISTS objective_templates (
    id               SERIAL PRIMARY KEY,
    code             VARCHAR(100) UNIQUE NOT NULL,
    label            VARCHAR(200) NOT NULL,
    category         VARCHAR(50)  NOT NULL, -- COMMERCIAL, RH, OPERATIONNEL
    description      TEXT,
    metric_code      VARCHAR(100),          -- réf. objective_metrics.code
    unit_code        VARCHAR(20),           -- réf. objective_units.code (plus stable qu'un id)
    tracking_type    VARCHAR(20)  DEFAULT 'AUTOMATIC',
    suggested_target DECIMAL(15, 2),
    is_default       BOOLEAN      DEFAULT TRUE,
    is_active        BOOLEAN      DEFAULT TRUE,
    sort_order       INTEGER      DEFAULT 10,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_obj_templates_category ON objective_templates(category);
CREATE INDEX IF NOT EXISTS idx_obj_templates_active   ON objective_templates(is_active);


-- ============================================================
-- PARTIE 2 : MÉTRIQUES MANQUANTES
-- ============================================================

INSERT INTO objective_metrics (code, label, description, calculation_type, target_unit_id, is_active)
VALUES
    ('NB_MISSIONS_ACTIVES',
     'Missions Actives',
     'Nombre de missions en statut en_cours sur l''exercice fiscal',
     'COUNT',
     (SELECT id FROM objective_units WHERE code = 'COUNT' LIMIT 1),
     TRUE),

    ('NB_MISSIONS_TERMINEES',
     'Missions Réalisées',
     'Nombre de missions en statut termine sur l''exercice fiscal',
     'COUNT',
     (SELECT id FROM objective_units WHERE code = 'COUNT' LIMIT 1),
     TRUE),

    ('REVENU_MISSIONS',
     'Revenus Missions',
     'Somme du budget_estime des missions terminées sur l''exercice fiscal',
     'SUM',
     (SELECT id FROM objective_units WHERE code IN ('XOF', 'EUR') ORDER BY (code = 'XOF') DESC LIMIT 1),
     TRUE),

    ('NB_CAMPAGNES_TERMINEES',
     'Campagnes de Prospection Réalisées',
     'Nombre de campagnes de prospection au statut TERMINEE sur l''exercice fiscal',
     'COUNT',
     (SELECT id FROM objective_units WHERE code = 'COUNT' LIMIT 1),
     TRUE),

    ('TAUX_OCCUPATION_COLLAB',
     'Taux d''Occupation des Collaborateurs',
     'Pourcentage de collaborateurs actifs assignés à une mission en_cours',
     'PERCENTAGE',
     (SELECT id FROM objective_units WHERE code = '%' LIMIT 1),
     TRUE),

    ('NB_RECRUTEMENTS',
     'Recrutements Réalisés',
     'Nombre de collaborateurs recrutés sur l''exercice fiscal',
     'COUNT',
     (SELECT id FROM objective_units WHERE code = 'COUNT' LIMIT 1),
     TRUE),

    ('HEURES_DECLAREES',
     'Heures Déclarées (validées)',
     'Somme des heures dans les feuilles de temps au statut VALIDE',
     'SUM',
     (SELECT id FROM objective_units WHERE code IN ('h', 'HOURS', 'heures') LIMIT 1),
     TRUE)

ON CONFLICT (code) DO UPDATE SET
    label            = EXCLUDED.label,
    description      = EXCLUDED.description,
    calculation_type = EXCLUDED.calculation_type,
    is_active        = TRUE,
    updated_at       = CURRENT_TIMESTAMP;


-- ============================================================
-- PARTIE 3 : REQUÊTES SQL DE CALCUL AUTOMATIQUE
-- :fiscal_year_id et :entity_id sont remplacés à l'exécution
-- ============================================================

INSERT INTO objective_metric_compute_queries (metric_code, scope, compute_sql, description) VALUES

-- CA_TOTAL
('CA_TOTAL', 'GLOBAL',
 'SELECT COALESCE(SUM(o.montant_estime), 0) FROM opportunities o WHERE o.statut = ''GAGNE'' AND o.fiscal_year_id = :fiscal_year_id',
 'Somme du montant_estime des opportunités GAGNEES'),

('CA_TOTAL', 'BU',
 'SELECT COALESCE(SUM(o.montant_estime), 0) FROM opportunities o WHERE o.statut = ''GAGNE'' AND o.fiscal_year_id = :fiscal_year_id AND o.business_unit_id::text = :entity_id',
 'CA par Business Unit'),

-- NB_CONTRATS
('NB_CONTRATS', 'GLOBAL',
 'SELECT COALESCE(COUNT(*), 0) FROM opportunities o WHERE o.statut = ''GAGNE'' AND o.fiscal_year_id = :fiscal_year_id',
 'Nombre d''opportunités GAGNEES'),

('NB_CONTRATS', 'BU',
 'SELECT COALESCE(COUNT(*), 0) FROM opportunities o WHERE o.statut = ''GAGNE'' AND o.fiscal_year_id = :fiscal_year_id AND o.business_unit_id::text = :entity_id',
 'Contrats signés par BU'),

-- NB_OPPORTUNITES
('NB_OPPORTUNITES', 'GLOBAL',
 'SELECT COALESCE(COUNT(*), 0) FROM opportunities o WHERE o.fiscal_year_id = :fiscal_year_id',
 'Toutes les opportunités créées sur l''exercice'),

('NB_OPPORTUNITES', 'BU',
 'SELECT COALESCE(COUNT(*), 0) FROM opportunities o WHERE o.fiscal_year_id = :fiscal_year_id AND o.business_unit_id::text = :entity_id',
 'Opportunités par BU'),

-- CLIENTS_COUNT
('CLIENTS_COUNT', 'GLOBAL',
 'SELECT COALESCE(COUNT(*), 0) FROM clients c JOIN fiscal_years fy ON fy.id = :fiscal_year_id WHERE c.created_at BETWEEN fy.date_debut AND fy.date_fin AND c.statut != ''ABANDONNE''',
 'Clients créés dans la période de l''exercice'),

-- CASH_COLLECTED
('CASH_COLLECTED', 'GLOBAL',
 'SELECT COALESCE(SUM(p.amount), 0) FROM payments p JOIN fiscal_years fy ON fy.id = :fiscal_year_id WHERE p.payment_date BETWEEN fy.date_debut AND fy.date_fin AND p.status = ''COMPLETED''',
 'Montant total des paiements clients reçus'),

-- NB_MISSIONS_ACTIVES
('NB_MISSIONS_ACTIVES', 'GLOBAL',
 'SELECT COALESCE(COUNT(*), 0) FROM missions m WHERE m.statut = ''en_cours'' AND m.fiscal_year_id = :fiscal_year_id',
 'Missions en cours sur l''exercice'),

('NB_MISSIONS_ACTIVES', 'DIVISION',
 'SELECT COALESCE(COUNT(*), 0) FROM missions m WHERE m.statut = ''en_cours'' AND m.fiscal_year_id = :fiscal_year_id AND m.division_id::text = :entity_id',
 'Missions actives par division'),

-- NB_MISSIONS_TERMINEES
('NB_MISSIONS_TERMINEES', 'GLOBAL',
 'SELECT COALESCE(COUNT(*), 0) FROM missions m WHERE m.statut = ''termine'' AND m.fiscal_year_id = :fiscal_year_id',
 'Missions terminées sur l''exercice'),

-- REVENU_MISSIONS
('REVENU_MISSIONS', 'GLOBAL',
 'SELECT COALESCE(SUM(m.budget_estime), 0) FROM missions m WHERE m.statut = ''termine'' AND m.fiscal_year_id = :fiscal_year_id',
 'Revenus des missions terminées (budget_estime)'),

-- NB_CAMPAGNES_TERMINEES
('NB_CAMPAGNES_TERMINEES', 'GLOBAL',
 'SELECT COALESCE(COUNT(*), 0) FROM prospecting_campaigns pc JOIN fiscal_years fy ON fy.id = :fiscal_year_id WHERE pc.statut = ''TERMINEE'' AND pc.created_at BETWEEN fy.date_debut AND fy.date_fin',
 'Campagnes de prospection terminées'),

-- TAUX_OCCUPATION_COLLAB
('TAUX_OCCUPATION_COLLAB', 'GLOBAL',
 'SELECT CASE WHEN COUNT(DISTINCT col.id) = 0 THEN 0 ELSE ROUND(COUNT(DISTINCT m.collaborateur_id) * 100.0 / NULLIF(COUNT(DISTINCT col.id), 0), 2) END FROM collaborateurs col LEFT JOIN missions m ON m.collaborateur_id = col.id AND m.statut = ''en_cours'' AND m.fiscal_year_id = :fiscal_year_id WHERE col.statut = ''actif''',
 'Taux d''occupation global'),

-- NB_RECRUTEMENTS
('NB_RECRUTEMENTS', 'GLOBAL',
 'SELECT COALESCE(COUNT(*), 0) FROM collaborateurs col JOIN fiscal_years fy ON fy.id = :fiscal_year_id WHERE col.created_at BETWEEN fy.date_debut AND fy.date_fin',
 'Collaborateurs recrutés sur l''exercice'),

-- HEURES_DECLAREES
('HEURES_DECLAREES', 'GLOBAL',
 'SELECT COALESCE(SUM(ts.total_heures), 0) FROM time_sheets ts JOIN fiscal_years fy ON fy.id = :fiscal_year_id WHERE ts.statut = ''VALIDE'' AND ts.created_at BETWEEN fy.date_debut AND fy.date_fin',
 'Heures validées dans les feuilles de temps')

ON CONFLICT (metric_code, scope) DO UPDATE SET
    compute_sql = EXCLUDED.compute_sql,
    updated_at  = CURRENT_TIMESTAMP;


-- ============================================================
-- PARTIE 4 : LES 12 TEMPLATES D'OBJECTIFS STANDARDS
-- ============================================================

INSERT INTO objective_templates (code, label, category, description, metric_code, unit_code, tracking_type, sort_order) VALUES

-- COMMERCIAL
('TPL_CA_GLOBAL',
 'Chiffre d''Affaires Global',
 'COMMERCIAL',
 'CA total : somme du montant_estime des opportunités GAGNEES sur l''exercice. Déclinable par BU.',
 'CA_TOTAL', 'XOF', 'AUTOMATIC', 10),

('TPL_REVENU_MISSIONS',
 'Revenus Générés par Missions',
 'COMMERCIAL',
 'Revenus des missions terminées : budget_estime des missions au statut TERMINEE.',
 'REVENU_MISSIONS', 'XOF', 'AUTOMATIC', 11),

('TPL_NB_CONTRATS',
 'Nombre de Contrats Signés',
 'COMMERCIAL',
 'Nombre d''opportunités passées en statut GAGNE sur l''exercice fiscal.',
 'NB_CONTRATS', 'COUNT', 'AUTOMATIC', 12),

('TPL_NB_NOUVEAUX_CLIENTS',
 'Nouveaux Clients Acquis',
 'COMMERCIAL',
 'Nombre de nouveaux clients créés dans le système sur la période de l''exercice.',
 'CLIENTS_COUNT', 'COUNT', 'AUTOMATIC', 13),

('TPL_NB_OPPORTUNITES',
 'Nouvelles Opportunités Créées',
 'COMMERCIAL',
 'Nombre total d''opportunités créées (pipeline commercial) sur l''exercice fiscal.',
 'NB_OPPORTUNITES', 'COUNT', 'AUTOMATIC', 14),

('TPL_ENCAISSEMENTS',
 'Encaissements Réalisés',
 'COMMERCIAL',
 'Montant total des paiements clients reçus (table payments, statut COMPLETED).',
 'CASH_COLLECTED', 'XOF', 'AUTOMATIC', 15),

('TPL_NB_CAMPAGNES',
 'Campagnes de Prospection Réalisées',
 'COMMERCIAL',
 'Nombre de campagnes de prospection menées à terme (statut TERMINEE).',
 'NB_CAMPAGNES_TERMINEES', 'COUNT', 'AUTOMATIC', 16),

-- OPERATIONNEL
('TPL_NB_MISSIONS_ACTIVES',
 'Missions Actives / En Cours',
 'OPERATIONNEL',
 'Nombre de missions avec statut en_cours rattachées à l''exercice fiscal courant.',
 'NB_MISSIONS_ACTIVES', 'COUNT', 'AUTOMATIC', 20),

('TPL_NB_MISSIONS_TERMINEES',
 'Missions Réalisées (Terminées)',
 'OPERATIONNEL',
 'Nombre de missions passées en statut TERMINEE sur l''exercice fiscal.',
 'NB_MISSIONS_TERMINEES', 'COUNT', 'AUTOMATIC', 21),

('TPL_HEURES_DECLAREES',
 'Heures de Travail Déclarées',
 'OPERATIONNEL',
 'Somme des heures dans les feuilles de temps au statut VALIDE sur l''exercice.',
 'HEURES_DECLAREES', 'COUNT', 'AUTOMATIC', 22),

-- RH
('TPL_TAUX_OCCUPATION',
 'Taux d''Occupation des Collaborateurs',
 'RH',
 'Pourcentage de collaborateurs actifs assignés à au moins une mission en_cours.',
 'TAUX_OCCUPATION_COLLAB', '%', 'AUTOMATIC', 30),

('TPL_NB_RECRUTEMENTS',
 'Recrutements Réalisés',
 'RH',
 'Nombre de nouveaux collaborateurs intégrés (créés dans le système) sur l''exercice.',
 'NB_RECRUTEMENTS', 'COUNT', 'AUTOMATIC', 31)

ON CONFLICT (code) DO UPDATE SET
    label         = EXCLUDED.label,
    description   = EXCLUDED.description,
    category      = EXCLUDED.category,
    metric_code   = EXCLUDED.metric_code,
    tracking_type = EXCLUDED.tracking_type,
    is_active     = TRUE,
    updated_at    = CURRENT_TIMESTAMP;


COMMIT;
