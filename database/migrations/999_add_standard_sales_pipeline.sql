-- Migration 999: Ajout du type d'opportunité "Vente standard" et de son pipeline d'étapes
-- Date: 2025-08-09

-- 1) Créer le type d'opportunité s'il n'existe pas
INSERT INTO opportunity_types (name, description, default_probability, default_duration_days, is_active)
SELECT 'Vente standard', 'Pipeline commercial standard (identification → décision)', 10, 30, TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM opportunity_types WHERE name = 'Vente standard'
);

-- 2) Supprimer d'éventuels templates existants pour repartir proprement (optionnel, sécurisé)
DELETE FROM opportunity_stage_templates 
WHERE opportunity_type_id IN (SELECT id FROM opportunity_types WHERE name = 'Vente standard');

-- 3) Insérer les templates d'étapes (6 étapes)

-- Étape 1: Identification
INSERT INTO opportunity_stage_templates (
    opportunity_type_id, stage_name, stage_order, description,
    required_documents, required_actions, max_duration_days, min_duration_days, validation_required
) 
SELECT 
    ot.id, 'Identification', 1,
    'Opportunité détectée; enregistrement et qualification rapide',
    '["Lead/Contact initial", "Notes de détection"]',
    '["Créer la fiche opportunité", "Qualifier rapidement l\'intérêt"]',
    7, 1, TRUE
FROM opportunity_types ot WHERE ot.name = 'Vente standard';

-- Étape 2: Qualification
INSERT INTO opportunity_stage_templates (
    opportunity_type_id, stage_name, stage_order, description,
    required_documents, required_actions, max_duration_days, min_duration_days, validation_required
) 
SELECT 
    ot.id, 'Qualification', 2,
    'Valider besoin, budget, décideurs, timing (ex. BANT)',
    '["Grille BANT", "Liste des décideurs"]',
    '["Valider BANT", "Identifier décideurs", "Estimer budget"]',
    10, 3, TRUE
FROM opportunity_types ot WHERE ot.name = 'Vente standard';

-- Étape 3: Discovery / Prise de contact
INSERT INTO opportunity_stage_templates (
    opportunity_type_id, stage_name, stage_order, description,
    required_documents, required_actions, max_duration_days, min_duration_days, validation_required
) 
SELECT 
    ot.id, 'Discovery / Prise de contact', 3,
    'Échanges approfondis, cadrage du périmètre et des enjeux',
    '["Compte-rendu réunion", "Points clés & risques"]',
    '["Réunion discovery", "Cadrage périmètre", "Planifier proposition"]',
    10, 3, TRUE
FROM opportunity_types ot WHERE ot.name = 'Vente standard';

-- Étape 4: Proposition
INSERT INTO opportunity_stage_templates (
    opportunity_type_id, stage_name, stage_order, description,
    required_documents, required_actions, max_duration_days, min_duration_days, validation_required
) 
SELECT 
    ot.id, 'Proposition', 4,
    'Production et envoi de l\'offre (technique + financière)',
    '["Proposition", "Chiffrage", "Conditions"]',
    '["Rédaction offre", "Validation interne", "Envoi au client"]',
    10, 3, TRUE
FROM opportunity_types ot WHERE ot.name = 'Vente standard';

-- Étape 5: Négociation
INSERT INTO opportunity_stage_templates (
    opportunity_type_id, stage_name, stage_order, description,
    required_documents, required_actions, max_duration_days, min_duration_days, validation_required
) 
SELECT 
    ot.id, 'Négociation', 5,
    'Convergence sur prix, périmètre, délais et conditions',
    '["Versions d\'offre", "Table des concessions"]',
    '["Négociation", "Alignement interne", "Validation client"]',
    15, 5, FALSE
FROM opportunity_types ot WHERE ot.name = 'Vente standard';

-- Étape 6: Décision
INSERT INTO opportunity_stage_templates (
    opportunity_type_id, stage_name, stage_order, description,
    required_documents, required_actions, max_duration_days, min_duration_days, validation_required
) 
SELECT 
    ot.id, 'Décision', 6,
    'Issue finale (gagnée/perdue); si gagnée, préparer onboarding',
    '["Bon pour accord/Contrat", "Compte-rendu de décision"]',
    '["Clôturer opportunité", "Préparer onboarding si gagnée"]',
    5, 1, TRUE
FROM opportunity_types ot WHERE ot.name = 'Vente standard';

-- 4) Marquer la migration comme exécutée (idempotent)
INSERT INTO migrations (filename, executed_at)
VALUES ('999_add_standard_sales_pipeline.sql', CURRENT_TIMESTAMP)
ON CONFLICT (filename) DO NOTHING;