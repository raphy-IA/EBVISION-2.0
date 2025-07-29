-- Migration 025: Création des templates d'étapes par défaut
-- Date: 2025-07-21

-- Template pour les missions d'Audit
INSERT INTO opportunity_stage_templates (opportunity_type_id, stage_name, stage_order, description, required_documents, required_actions, max_duration_days, min_duration_days, validation_required) 
SELECT 
    ot.id,
    'Préparation et planification',
    1,
    'Définition du périmètre, constitution de l''équipe, élaboration du planning',
    '["Lettre de mission", "Planning détaillé", "Composition équipe"]',
    '["Réunion de lancement", "Analyse des risques", "Préparation des outils"]',
    7,
    3,
    TRUE
FROM opportunity_types ot WHERE ot.name = 'Audit';

INSERT INTO opportunity_stage_templates (opportunity_type_id, stage_name, stage_order, description, required_documents, required_actions, max_duration_days, min_duration_days, validation_required) 
SELECT 
    ot.id,
    'Exécution des travaux',
    2,
    'Réalisation des tests de conformité et des contrôles',
    '["Fiches de travail", "Échantillons testés", "Correspondances"]',
    '["Tests de conformité", "Contrôles sur place", "Entretiens"]',
    25,
    10,
    FALSE
FROM opportunity_types ot WHERE ot.name = 'Audit';

INSERT INTO opportunity_stage_templates (opportunity_type_id, stage_name, stage_order, description, required_documents, required_actions, max_duration_days, min_duration_days, validation_required) 
SELECT 
    ot.id,
    'Finalisation et rapport',
    3,
    'Rédaction du rapport, validation finale, présentation',
    '["Rapport d''audit", "Lettre de recommandations", "Présentation client"]',
    '["Rédaction rapport", "Validation hiérarchique", "Présentation résultats"]',
    10,
    5,
    TRUE
FROM opportunity_types ot WHERE ot.name = 'Audit';

-- Template pour les missions de Conseil
INSERT INTO opportunity_stage_templates (opportunity_type_id, stage_name, stage_order, description, required_documents, required_actions, max_duration_days, min_duration_days, validation_required) 
SELECT 
    ot.id,
    'Diagnostic initial',
    1,
    'Analyse de la situation actuelle et identification des besoins',
    '["Rapport de diagnostic", "Questionnaire client", "Analyse des processus"]',
    '["Entretiens dirigeants", "Analyse documentaire", "Observation terrain"]',
    10,
    5,
    TRUE
FROM opportunity_types ot WHERE ot.name = 'Conseil';

INSERT INTO opportunity_stage_templates (opportunity_type_id, stage_name, stage_order, description, required_documents, required_actions, max_duration_days, min_duration_days, validation_required) 
SELECT 
    ot.id,
    'Élaboration des recommandations',
    2,
    'Développement des solutions et plan d''action',
    '["Plan d''action", "Recommandations détaillées", "Étude de faisabilité"]',
    '["Brainstorming équipe", "Analyse coûts-bénéfices", "Validation technique"]',
    15,
    7,
    TRUE
FROM opportunity_types ot WHERE ot.name = 'Conseil';

INSERT INTO opportunity_stage_templates (opportunity_type_id, stage_name, stage_order, description, required_documents, required_actions, max_duration_days, min_duration_days, validation_required) 
SELECT 
    ot.id,
    'Accompagnement à la mise en œuvre',
    3,
    'Suivi de l''implémentation et formation des équipes',
    '["Plan de formation", "Procédures opérationnelles", "Suivi de mise en œuvre"]',
    '["Formation équipes", "Suivi projet", "Ajustements"]',
    20,
    10,
    FALSE
FROM opportunity_types ot WHERE ot.name = 'Conseil';

-- Template pour les Formations
INSERT INTO opportunity_stage_templates (opportunity_type_id, stage_name, stage_order, description, required_documents, required_actions, max_duration_days, min_duration_days, validation_required) 
SELECT 
    ot.id,
    'Analyse des besoins',
    1,
    'Évaluation des compétences actuelles et définition des objectifs',
    '["Audit des compétences", "Objectifs de formation", "Profil des participants"]',
    '["Entretiens RH", "Tests de niveau", "Analyse des postes"]',
    5,
    2,
    TRUE
FROM opportunity_types ot WHERE ot.name = 'Formation';

INSERT INTO opportunity_stage_templates (opportunity_type_id, stage_name, stage_order, description, required_documents, required_actions, max_duration_days, min_duration_days, validation_required) 
SELECT 
    ot.id,
    'Conception du programme',
    2,
    'Élaboration du contenu et des supports de formation',
    '["Programme détaillé", "Supports pédagogiques", "Exercices pratiques"]',
    '["Conception pédagogique", "Création supports", "Tests pilotes"]',
    7,
    3,
    TRUE
FROM opportunity_types ot WHERE ot.name = 'Formation';

INSERT INTO opportunity_stage_templates (opportunity_type_id, stage_name, stage_order, description, required_documents, required_actions, max_duration_days, min_duration_days, validation_required) 
SELECT 
    ot.id,
    'Animation de la formation',
    3,
    'Délivrance de la formation et suivi des participants',
    '["Feuilles de présence", "Évaluations", "Retours participants"]',
    '["Animation sessions", "Suivi apprentissage", "Ajustements contenu"]',
    10,
    5,
    FALSE
FROM opportunity_types ot WHERE ot.name = 'Formation';

INSERT INTO opportunity_stage_templates (opportunity_type_id, stage_name, stage_order, description, required_documents, required_actions, max_duration_days, min_duration_days, validation_required) 
SELECT 
    ot.id,
    'Évaluation et suivi',
    4,
    'Mesure de l''efficacité et suivi post-formation',
    '["Rapport d''évaluation", "Plan de suivi", "Recommandations"]',
    '["Tests de validation", "Entretiens post-formation", "Analyse ROI"]',
    5,
    2,
    TRUE
FROM opportunity_types ot WHERE ot.name = 'Formation';

-- Template pour les Expertises
INSERT INTO opportunity_stage_templates (opportunity_type_id, stage_name, stage_order, description, required_documents, required_actions, max_duration_days, min_duration_days, validation_required) 
SELECT 
    ot.id,
    'Analyse de la demande',
    1,
    'Compréhension du besoin et évaluation de la complexité',
    '["Demande client", "Analyse préliminaire", "Estimation complexité"]',
    '["Entretien client", "Analyse documentaire", "Évaluation risques"]',
    5,
    2,
    TRUE
FROM opportunity_types ot WHERE ot.name = 'Expertise';

INSERT INTO opportunity_stage_templates (opportunity_type_id, stage_name, stage_order, description, required_documents, required_actions, max_duration_days, min_duration_days, validation_required) 
SELECT 
    ot.id,
    'Recherche et analyse',
    2,
    'Investigation approfondie et analyse technique',
    '["Rapport d''analyse", "Études comparatives", "Expertises techniques"]',
    '["Recherche documentaire", "Consultations experts", "Analyses techniques"]',
    15,
    7,
    FALSE
FROM opportunity_types ot WHERE ot.name = 'Expertise';

INSERT INTO opportunity_stage_templates (opportunity_type_id, stage_name, stage_order, description, required_documents, required_actions, max_duration_days, min_duration_days, validation_required) 
SELECT 
    ot.id,
    'Rédaction de l''expertise',
    3,
    'Rédaction du rapport d''expertise et recommandations',
    '["Rapport d''expertise", "Annexes techniques", "Recommandations"]',
    '["Rédaction rapport", "Validation technique", "Relecture"]',
    10,
    5,
    TRUE
FROM opportunity_types ot WHERE ot.name = 'Expertise';

-- Template pour le Consulting
INSERT INTO opportunity_stage_templates (opportunity_type_id, stage_name, stage_order, description, required_documents, required_actions, max_duration_days, min_duration_days, validation_required) 
SELECT 
    ot.id,
    'Phase de découverte',
    1,
    'Exploration approfondie de l''organisation et des enjeux',
    '["Rapport de découverte", "Cartographie organisation", "Analyse des enjeux"]',
    '["Entretiens dirigeants", "Observation organisation", "Analyse processus"]',
    12,
    5,
    TRUE
FROM opportunity_types ot WHERE ot.name = 'Consulting';

INSERT INTO opportunity_stage_templates (opportunity_type_id, stage_name, stage_order, description, required_documents, required_actions, max_duration_days, min_duration_days, validation_required) 
SELECT 
    ot.id,
    'Stratégie et planification',
    2,
    'Définition de la stratégie et plan de transformation',
    '["Stratégie de transformation", "Roadmap projet", "Plan de communication"]',
    '["Workshops stratégiques", "Planification détaillée", "Validation direction"]',
    15,
    7,
    TRUE
FROM opportunity_types ot WHERE ot.name = 'Consulting';

INSERT INTO opportunity_stage_templates (opportunity_type_id, stage_name, stage_order, description, required_documents, required_actions, max_duration_days, min_duration_days, validation_required) 
SELECT 
    ot.id,
    'Accompagnement au changement',
    3,
    'Mise en œuvre et accompagnement des équipes',
    '["Plan de changement", "Supports formation", "Suivi adoption"]',
    '["Formation équipes", "Accompagnement quotidien", "Gestion résistances"]',
    25,
    15,
    FALSE
FROM opportunity_types ot WHERE ot.name = 'Consulting';

INSERT INTO opportunity_stage_templates (opportunity_type_id, stage_name, stage_order, description, required_documents, required_actions, max_duration_days, min_duration_days, validation_required) 
SELECT 
    ot.id,
    'Évaluation et pérennisation',
    4,
    'Mesure des résultats et transfert de compétences',
    '["Rapport final", "Indicateurs de succès", "Plan de pérennisation"]',
    '["Évaluation résultats", "Transfert compétences", "Clôture projet"]',
    8,
    3,
    TRUE
FROM opportunity_types ot WHERE ot.name = 'Consulting';

-- Marquer cette migration comme exécutée
INSERT INTO migrations (filename, executed_at) 
VALUES ('025_create_default_stage_templates.sql', CURRENT_TIMESTAMP)
ON CONFLICT (filename) DO NOTHING; 