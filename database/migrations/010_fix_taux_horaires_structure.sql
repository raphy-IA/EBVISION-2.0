-- Migration 010: Correction de la structure des taux horaires et ajout du salaire de base
-- Date: 2025-07-19
-- Description: Ajout du salaire de base et amélioration de la structure des taux horaires

-- =====================================================
-- 1. SUPPRESSION DE L'ANCIENNE TABLE TAUX_HORAIRES
-- =====================================================
DROP TABLE IF EXISTS taux_horaires CASCADE;

-- =====================================================
-- 2. CRÉATION DE LA NOUVELLE TABLE TAUX HORAIRES ET SALAIRES
-- =====================================================
CREATE TABLE IF NOT EXISTS taux_horaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
    division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
    taux_horaire DECIMAL(10,2) NOT NULL CHECK (taux_horaire > 0),
    salaire_base DECIMAL(10,2) NOT NULL CHECK (salaire_base > 0),
    date_effet DATE NOT NULL,
    date_fin_effet DATE,
    statut VARCHAR(20) NOT NULL DEFAULT 'ACTIF' CHECK (statut IN ('ACTIF', 'INACTIF')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(grade_id, division_id, date_effet)
);

-- Index pour les taux horaires
CREATE INDEX idx_taux_horaires_grade ON taux_horaires(grade_id);
CREATE INDEX idx_taux_horaires_division ON taux_horaires(division_id);
CREATE INDEX idx_taux_horaires_dates ON taux_horaires(date_effet, date_fin_effet);
CREATE INDEX idx_taux_horaires_statut ON taux_horaires(statut);
CREATE INDEX idx_taux_horaires_grade_division ON taux_horaires(grade_id, division_id);

-- =====================================================
-- 3. DONNÉES INITIALES POUR LES TAUX HORAIRES
-- =====================================================
-- Récupérer les IDs des grades et divisions existants
DO $$
DECLARE
    grade_assistant_id UUID;
    grade_senior_id UUID;
    grade_manager_id UUID;
    grade_director_id UUID;
    grade_partner_id UUID;
    division_consulting_id UUID;
    division_tech_id UUID;
    division_admin_id UUID;
    division_finance_id UUID;
BEGIN
    -- Récupérer les IDs des grades
    SELECT id INTO grade_assistant_id FROM grades WHERE code = 'ASSISTANT' LIMIT 1;
    SELECT id INTO grade_senior_id FROM grades WHERE code = 'SENIOR' LIMIT 1;
    SELECT id INTO grade_manager_id FROM grades WHERE code = 'MANAGER' LIMIT 1;
    SELECT id INTO grade_director_id FROM grades WHERE code = 'DIRECTOR' LIMIT 1;
    SELECT id INTO grade_partner_id FROM grades WHERE code = 'PARTNER' LIMIT 1;
    
    -- Récupérer les IDs des divisions
    SELECT id INTO division_consulting_id FROM divisions WHERE code = 'CONSULTING' LIMIT 1;
    SELECT id INTO division_tech_id FROM divisions WHERE code = 'TECH' LIMIT 1;
    SELECT id INTO division_admin_id FROM divisions WHERE code = 'ADMIN' LIMIT 1;
    SELECT id INTO division_finance_id FROM divisions WHERE code = 'FINANCE' LIMIT 1;
    
    -- Insérer les taux horaires et salaires de base pour chaque combinaison grade/division
    -- Division Consulting
    IF grade_assistant_id IS NOT NULL AND division_consulting_id IS NOT NULL THEN
        INSERT INTO taux_horaires (grade_id, division_id, taux_horaire, salaire_base, date_effet)
        VALUES (grade_assistant_id, division_consulting_id, 45.00, 3500.00, CURRENT_DATE)
        ON CONFLICT (grade_id, division_id, date_effet) DO NOTHING;
    END IF;
    
    IF grade_senior_id IS NOT NULL AND division_consulting_id IS NOT NULL THEN
        INSERT INTO taux_horaires (grade_id, division_id, taux_horaire, salaire_base, date_effet)
        VALUES (grade_senior_id, division_consulting_id, 65.00, 5200.00, CURRENT_DATE)
        ON CONFLICT (grade_id, division_id, date_effet) DO NOTHING;
    END IF;
    
    IF grade_manager_id IS NOT NULL AND division_consulting_id IS NOT NULL THEN
        INSERT INTO taux_horaires (grade_id, division_id, taux_horaire, salaire_base, date_effet)
        VALUES (grade_manager_id, division_consulting_id, 85.00, 6800.00, CURRENT_DATE)
        ON CONFLICT (grade_id, division_id, date_effet) DO NOTHING;
    END IF;
    
    IF grade_director_id IS NOT NULL AND division_consulting_id IS NOT NULL THEN
        INSERT INTO taux_horaires (grade_id, division_id, taux_horaire, salaire_base, date_effet)
        VALUES (grade_director_id, division_consulting_id, 110.00, 8800.00, CURRENT_DATE)
        ON CONFLICT (grade_id, division_id, date_effet) DO NOTHING;
    END IF;
    
    IF grade_partner_id IS NOT NULL AND division_consulting_id IS NOT NULL THEN
        INSERT INTO taux_horaires (grade_id, division_id, taux_horaire, salaire_base, date_effet)
        VALUES (grade_partner_id, division_consulting_id, 150.00, 12000.00, CURRENT_DATE)
        ON CONFLICT (grade_id, division_id, date_effet) DO NOTHING;
    END IF;
    
    -- Division Tech
    IF grade_assistant_id IS NOT NULL AND division_tech_id IS NOT NULL THEN
        INSERT INTO taux_horaires (grade_id, division_id, taux_horaire, salaire_base, date_effet)
        VALUES (grade_assistant_id, division_tech_id, 50.00, 3800.00, CURRENT_DATE)
        ON CONFLICT (grade_id, division_id, date_effet) DO NOTHING;
    END IF;
    
    IF grade_senior_id IS NOT NULL AND division_tech_id IS NOT NULL THEN
        INSERT INTO taux_horaires (grade_id, division_id, taux_horaire, salaire_base, date_effet)
        VALUES (grade_senior_id, division_tech_id, 75.00, 5800.00, CURRENT_DATE)
        ON CONFLICT (grade_id, division_id, date_effet) DO NOTHING;
    END IF;
    
    IF grade_manager_id IS NOT NULL AND division_tech_id IS NOT NULL THEN
        INSERT INTO taux_horaires (grade_id, division_id, taux_horaire, salaire_base, date_effet)
        VALUES (grade_manager_id, division_tech_id, 95.00, 7200.00, CURRENT_DATE)
        ON CONFLICT (grade_id, division_id, date_effet) DO NOTHING;
    END IF;
    
    IF grade_director_id IS NOT NULL AND division_tech_id IS NOT NULL THEN
        INSERT INTO taux_horaires (grade_id, division_id, taux_horaire, salaire_base, date_effet)
        VALUES (grade_director_id, division_tech_id, 125.00, 9500.00, CURRENT_DATE)
        ON CONFLICT (grade_id, division_id, date_effet) DO NOTHING;
    END IF;
    
    IF grade_partner_id IS NOT NULL AND division_tech_id IS NOT NULL THEN
        INSERT INTO taux_horaires (grade_id, division_id, taux_horaire, salaire_base, date_effet)
        VALUES (grade_partner_id, division_tech_id, 170.00, 13000.00, CURRENT_DATE)
        ON CONFLICT (grade_id, division_id, date_effet) DO NOTHING;
    END IF;
    
    -- Division Admin
    IF grade_assistant_id IS NOT NULL AND division_admin_id IS NOT NULL THEN
        INSERT INTO taux_horaires (grade_id, division_id, taux_horaire, salaire_base, date_effet)
        VALUES (grade_assistant_id, division_admin_id, 35.00, 2800.00, CURRENT_DATE)
        ON CONFLICT (grade_id, division_id, date_effet) DO NOTHING;
    END IF;
    
    IF grade_senior_id IS NOT NULL AND division_admin_id IS NOT NULL THEN
        INSERT INTO taux_horaires (grade_id, division_id, taux_horaire, salaire_base, date_effet)
        VALUES (grade_senior_id, division_admin_id, 45.00, 3600.00, CURRENT_DATE)
        ON CONFLICT (grade_id, division_id, date_effet) DO NOTHING;
    END IF;
    
    IF grade_manager_id IS NOT NULL AND division_admin_id IS NOT NULL THEN
        INSERT INTO taux_horaires (grade_id, division_id, taux_horaire, salaire_base, date_effet)
        VALUES (grade_manager_id, division_admin_id, 60.00, 4800.00, CURRENT_DATE)
        ON CONFLICT (grade_id, division_id, date_effet) DO NOTHING;
    END IF;
    
    IF grade_director_id IS NOT NULL AND division_admin_id IS NOT NULL THEN
        INSERT INTO taux_horaires (grade_id, division_id, taux_horaire, salaire_base, date_effet)
        VALUES (grade_director_id, division_admin_id, 80.00, 6400.00, CURRENT_DATE)
        ON CONFLICT (grade_id, division_id, date_effet) DO NOTHING;
    END IF;
    
    IF grade_partner_id IS NOT NULL AND division_admin_id IS NOT NULL THEN
        INSERT INTO taux_horaires (grade_id, division_id, taux_horaire, salaire_base, date_effet)
        VALUES (grade_partner_id, division_admin_id, 120.00, 9600.00, CURRENT_DATE)
        ON CONFLICT (grade_id, division_id, date_effet) DO NOTHING;
    END IF;
    
    -- Division Finance
    IF grade_assistant_id IS NOT NULL AND division_finance_id IS NOT NULL THEN
        INSERT INTO taux_horaires (grade_id, division_id, taux_horaire, salaire_base, date_effet)
        VALUES (grade_assistant_id, division_finance_id, 40.00, 3200.00, CURRENT_DATE)
        ON CONFLICT (grade_id, division_id, date_effet) DO NOTHING;
    END IF;
    
    IF grade_senior_id IS NOT NULL AND division_finance_id IS NOT NULL THEN
        INSERT INTO taux_horaires (grade_id, division_id, taux_horaire, salaire_base, date_effet)
        VALUES (grade_senior_id, division_finance_id, 55.00, 4400.00, CURRENT_DATE)
        ON CONFLICT (grade_id, division_id, date_effet) DO NOTHING;
    END IF;
    
    IF grade_manager_id IS NOT NULL AND division_finance_id IS NOT NULL THEN
        INSERT INTO taux_horaires (grade_id, division_id, taux_horaire, salaire_base, date_effet)
        VALUES (grade_manager_id, division_finance_id, 70.00, 5600.00, CURRENT_DATE)
        ON CONFLICT (grade_id, division_id, date_effet) DO NOTHING;
    END IF;
    
    IF grade_director_id IS NOT NULL AND division_finance_id IS NOT NULL THEN
        INSERT INTO taux_horaires (grade_id, division_id, taux_horaire, salaire_base, date_effet)
        VALUES (grade_director_id, division_finance_id, 90.00, 7200.00, CURRENT_DATE)
        ON CONFLICT (grade_id, division_id, date_effet) DO NOTHING;
    END IF;
    
    IF grade_partner_id IS NOT NULL AND division_finance_id IS NOT NULL THEN
        INSERT INTO taux_horaires (grade_id, division_id, taux_horaire, salaire_base, date_effet)
        VALUES (grade_partner_id, division_finance_id, 130.00, 10400.00, CURRENT_DATE)
        ON CONFLICT (grade_id, division_id, date_effet) DO NOTHING;
    END IF;
    
END $$;

-- =====================================================
-- 4. TRIGGER POUR MISE À JOUR AUTOMATIQUE
-- =====================================================
CREATE TRIGGER update_taux_horaires_updated_at BEFORE UPDATE ON taux_horaires FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. COMMENTAIRES
-- =====================================================
COMMENT ON TABLE taux_horaires IS 'Taux horaires et salaires de base par grade et division';
COMMENT ON COLUMN taux_horaires.taux_horaire IS 'Taux horaire en euros';
COMMENT ON COLUMN taux_horaires.salaire_base IS 'Salaire de base mensuel en euros';
COMMENT ON COLUMN taux_horaires.date_effet IS 'Date de début d''application du taux et salaire';
COMMENT ON COLUMN taux_horaires.date_fin_effet IS 'Date de fin d''application (NULL = toujours valide)'; 