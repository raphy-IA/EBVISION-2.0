-- Migration 009: Ajout des postes, types de collaborateurs et taux horaires
-- Date: 2025-07-19
-- Description: Structure complète pour la gestion des collaborateurs selon les spécifications métier

-- =====================================================
-- 1. CRÉATION DE LA TABLE TYPES DE COLLABORATEURS
-- =====================================================
CREATE TABLE IF NOT EXISTS types_collaborateurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    statut VARCHAR(20) NOT NULL DEFAULT 'ACTIF' CHECK (statut IN ('ACTIF', 'INACTIF')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les types de collaborateurs
CREATE INDEX idx_types_collaborateurs_code ON types_collaborateurs(code);
CREATE INDEX idx_types_collaborateurs_statut ON types_collaborateurs(statut);

-- =====================================================
-- 2. CRÉATION DE LA TABLE POSTES
-- =====================================================
CREATE TABLE IF NOT EXISTS postes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    type_collaborateur_id UUID NOT NULL REFERENCES types_collaborateurs(id) ON DELETE CASCADE,
    description TEXT,
    statut VARCHAR(20) NOT NULL DEFAULT 'ACTIF' CHECK (statut IN ('ACTIF', 'INACTIF')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les postes
CREATE INDEX idx_postes_code ON postes(code);
CREATE INDEX idx_postes_type_collaborateur ON postes(type_collaborateur_id);
CREATE INDEX idx_postes_statut ON postes(statut);

-- =====================================================
-- 3. CRÉATION DE LA TABLE TAUX HORAIRES PAR GRADE ET DIVISION
-- =====================================================
CREATE TABLE IF NOT EXISTS taux_horaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
    division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
    taux_horaire DECIMAL(10,2) NOT NULL,
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

-- =====================================================
-- 4. MODIFICATION DE LA TABLE COLLABORATEURS
-- =====================================================
-- Ajouter les colonnes manquantes
ALTER TABLE collaborateurs ADD COLUMN IF NOT EXISTS type_collaborateur_id UUID REFERENCES types_collaborateurs(id) ON DELETE SET NULL;
ALTER TABLE collaborateurs ADD COLUMN IF NOT EXISTS poste_actuel_id UUID REFERENCES postes(id) ON DELETE SET NULL;

-- Index pour les nouvelles colonnes
CREATE INDEX IF NOT EXISTS idx_collaborateurs_type ON collaborateurs(type_collaborateur_id);
CREATE INDEX IF NOT EXISTS idx_collaborateurs_poste ON collaborateurs(poste_actuel_id);

-- =====================================================
-- 5. CRÉATION DE LA TABLE ÉVOLUTION DES POSTES
-- =====================================================
CREATE TABLE IF NOT EXISTS evolution_postes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaborateur_id UUID NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
    poste_id UUID NOT NULL REFERENCES postes(id) ON DELETE CASCADE,
    date_debut DATE NOT NULL,
    date_fin DATE,
    motif TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour l'évolution des postes
CREATE INDEX idx_evolution_postes_collaborateur ON evolution_postes(collaborateur_id);
CREATE INDEX idx_evolution_postes_poste ON evolution_postes(poste_id);
CREATE INDEX idx_evolution_postes_dates ON evolution_postes(date_debut, date_fin);

-- =====================================================
-- 6. DONNÉES INITIALES
-- =====================================================

-- Types de collaborateurs
INSERT INTO types_collaborateurs (nom, code, description) 
SELECT 'Administratif', 'ADMIN', 'Personnel administratif et support'
WHERE NOT EXISTS (SELECT 1 FROM types_collaborateurs WHERE code = 'ADMIN');

INSERT INTO types_collaborateurs (nom, code, description) 
SELECT 'Consultant', 'CONSULTANT', 'Personnel consultant et technique'
WHERE NOT EXISTS (SELECT 1 FROM types_collaborateurs WHERE code = 'CONSULTANT');

-- Postes administratifs
INSERT INTO postes (nom, code, type_collaborateur_id, description) 
SELECT 'Secrétaire', 'SECRETAIRE', tc.id, 'Secrétaire administrative'
FROM types_collaborateurs tc WHERE tc.code = 'ADMIN'
AND NOT EXISTS (SELECT 1 FROM postes WHERE code = 'SECRETAIRE');

INSERT INTO postes (nom, code, type_collaborateur_id, description) 
SELECT 'Support IT', 'SUPPORT_IT', tc.id, 'Support informatique'
FROM types_collaborateurs tc WHERE tc.code = 'ADMIN'
AND NOT EXISTS (SELECT 1 FROM postes WHERE code = 'SUPPORT_IT');

INSERT INTO postes (nom, code, type_collaborateur_id, description) 
SELECT 'Responsable IT', 'RESP_IT', tc.id, 'Responsable informatique'
FROM types_collaborateurs tc WHERE tc.code = 'ADMIN'
AND NOT EXISTS (SELECT 1 FROM postes WHERE code = 'RESP_IT');

INSERT INTO postes (nom, code, type_collaborateur_id, description) 
SELECT 'Responsable Sécurité', 'RESP_SECU', tc.id, 'Responsable sécurité'
FROM types_collaborateurs tc WHERE tc.code = 'ADMIN'
AND NOT EXISTS (SELECT 1 FROM postes WHERE code = 'RESP_SECU');

-- Postes consultants
INSERT INTO postes (nom, code, type_collaborateur_id, description) 
SELECT 'Consultant', 'CONSULTANT', tc.id, 'Consultant'
FROM types_collaborateurs tc WHERE tc.code = 'CONSULTANT'
AND NOT EXISTS (SELECT 1 FROM postes WHERE code = 'CONSULTANT');

-- =====================================================
-- 7. TRIGGERS POUR MISE À JOUR AUTOMATIQUE
-- =====================================================
CREATE TRIGGER update_types_collaborateurs_updated_at BEFORE UPDATE ON types_collaborateurs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_postes_updated_at BEFORE UPDATE ON postes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_taux_horaires_updated_at BEFORE UPDATE ON taux_horaires FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. COMMENTAIRES
-- =====================================================
COMMENT ON TABLE types_collaborateurs IS 'Types de collaborateurs (Administratif, Consultant)';
COMMENT ON TABLE postes IS 'Postes occupés par les collaborateurs';
COMMENT ON TABLE taux_horaires IS 'Taux horaires par grade et division';
COMMENT ON TABLE evolution_postes IS 'Historique de l''évolution des postes des collaborateurs';

COMMENT ON COLUMN types_collaborateurs.code IS 'Code unique du type (ADMIN, CONSULTANT)';
COMMENT ON COLUMN postes.code IS 'Code unique du poste';
COMMENT ON COLUMN postes.type_collaborateur_id IS 'Type de collaborateur associé au poste';
COMMENT ON COLUMN taux_horaires.taux_horaire IS 'Taux horaire en euros';
COMMENT ON COLUMN taux_horaires.date_effet IS 'Date de début d''application du taux';
COMMENT ON COLUMN taux_horaires.date_fin_effet IS 'Date de fin d''application du taux (NULL = toujours valide)'; 