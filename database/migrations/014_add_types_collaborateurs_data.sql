-- Migration 014: Ajout des types de collaborateurs
-- Date: 2025-01-27
-- Description: Ajout des types de collaborateurs selon les spécifications

-- =====================================================
-- 1. AJOUT DES TYPES DE COLLABORATEURS
-- =====================================================

-- Consultant
INSERT INTO types_collaborateurs (nom, code, description, statut) 
SELECT 'Consultant', 'CONSULTANT', 'Personnel consultant et technique', 'ACTIF'
WHERE NOT EXISTS (SELECT 1 FROM types_collaborateurs WHERE code = 'CONSULTANT');

-- Administratif
INSERT INTO types_collaborateurs (nom, code, description, statut) 
SELECT 'Administratif', 'ADMINISTRATIF', 'Personnel administratif et support', 'ACTIF'
WHERE NOT EXISTS (SELECT 1 FROM types_collaborateurs WHERE code = 'ADMINISTRATIF');

-- Support
INSERT INTO types_collaborateurs (nom, code, description, statut) 
SELECT 'Support', 'SUPPORT', 'Personnel de support technique', 'ACTIF'
WHERE NOT EXISTS (SELECT 1 FROM types_collaborateurs WHERE code = 'SUPPORT');

-- Autre
INSERT INTO types_collaborateurs (nom, code, description, statut) 
SELECT 'Autre', 'AUTRE', 'Autres types de collaborateurs', 'ACTIF'
WHERE NOT EXISTS (SELECT 1 FROM types_collaborateurs WHERE code = 'AUTRE');

-- =====================================================
-- 2. AJOUT DES POSTES CORRESPONDANTS
-- =====================================================

-- Postes pour Consultants
INSERT INTO postes (nom, code, type_collaborateur_id, description, statut) 
SELECT 'Consultant', 'CONSULTANT', tc.id, 'Consultant', 'ACTIF'
FROM types_collaborateurs tc WHERE tc.code = 'CONSULTANT'
AND NOT EXISTS (SELECT 1 FROM postes WHERE code = 'CONSULTANT');

INSERT INTO postes (nom, code, type_collaborateur_id, description, statut) 
SELECT 'Senior Consultant', 'SENIOR_CONSULTANT', tc.id, 'Consultant senior', 'ACTIF'
FROM types_collaborateurs tc WHERE tc.code = 'CONSULTANT'
AND NOT EXISTS (SELECT 1 FROM postes WHERE code = 'SENIOR_CONSULTANT');

INSERT INTO postes (nom, code, type_collaborateur_id, description, statut) 
SELECT 'Manager', 'MANAGER', tc.id, 'Manager', 'ACTIF'
FROM types_collaborateurs tc WHERE tc.code = 'CONSULTANT'
AND NOT EXISTS (SELECT 1 FROM postes WHERE code = 'MANAGER');

-- Postes pour Administratif
INSERT INTO postes (nom, code, type_collaborateur_id, description, statut) 
SELECT 'Secrétaire', 'SECRETAIRE', tc.id, 'Secrétaire administrative', 'ACTIF'
FROM types_collaborateurs tc WHERE tc.code = 'ADMINISTRATIF'
AND NOT EXISTS (SELECT 1 FROM postes WHERE code = 'SECRETAIRE');

INSERT INTO postes (nom, code, type_collaborateur_id, description, statut) 
SELECT 'Assistant administratif', 'ASSISTANT_ADMIN', tc.id, 'Assistant administratif', 'ACTIF'
FROM types_collaborateurs tc WHERE tc.code = 'ADMINISTRATIF'
AND NOT EXISTS (SELECT 1 FROM postes WHERE code = 'ASSISTANT_ADMIN');

INSERT INTO postes (nom, code, type_collaborateur_id, description, statut) 
SELECT 'Responsable administratif', 'RESP_ADMIN', tc.id, 'Responsable administratif', 'ACTIF'
FROM types_collaborateurs tc WHERE tc.code = 'ADMINISTRATIF'
AND NOT EXISTS (SELECT 1 FROM postes WHERE code = 'RESP_ADMIN');

-- Postes pour Support
INSERT INTO postes (nom, code, type_collaborateur_id, description, statut) 
SELECT 'Support IT', 'SUPPORT_IT', tc.id, 'Support informatique', 'ACTIF'
FROM types_collaborateurs tc WHERE tc.code = 'SUPPORT'
AND NOT EXISTS (SELECT 1 FROM postes WHERE code = 'SUPPORT_IT');

INSERT INTO postes (nom, code, type_collaborateur_id, description, statut) 
SELECT 'Technicien support', 'TECH_SUPPORT', tc.id, 'Technicien support', 'ACTIF'
FROM types_collaborateurs tc WHERE tc.code = 'SUPPORT'
AND NOT EXISTS (SELECT 1 FROM postes WHERE code = 'TECH_SUPPORT');

-- Postes pour Autre
INSERT INTO postes (nom, code, type_collaborateur_id, description, statut) 
SELECT 'Autre', 'AUTRE', tc.id, 'Autre poste', 'ACTIF'
FROM types_collaborateurs tc WHERE tc.code = 'AUTRE'
AND NOT EXISTS (SELECT 1 FROM postes WHERE code = 'AUTRE');

-- =====================================================
-- 3. COMMENTAIRES
-- =====================================================
COMMENT ON TABLE types_collaborateurs IS 'Types de collaborateurs (Consultant, Administratif, Support, Autre)';
COMMENT ON TABLE postes IS 'Postes associés aux types de collaborateurs'; 