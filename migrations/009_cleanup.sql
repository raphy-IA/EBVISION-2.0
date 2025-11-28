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
