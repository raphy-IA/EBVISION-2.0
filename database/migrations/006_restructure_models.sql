-- Migration 006: Restructuration des modèles selon les spécifications métier
-- Date: 2025-07-18
-- Description: Séparation utilisateurs/collaborateurs, gestion des grades, types d'heures

-- =====================================================
-- 1. CRÉATION DE LA TABLE GRADES
-- =====================================================
CREATE TABLE IF NOT EXISTS grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    division_id UUID REFERENCES divisions(id) ON DELETE CASCADE,
    taux_horaire_default DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    niveau INTEGER NOT NULL DEFAULT 1, -- Pour l'ordre hiérarchique
    description TEXT,
    statut VARCHAR(20) NOT NULL DEFAULT 'ACTIF' CHECK (statut IN ('ACTIF', 'INACTIF')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les grades
CREATE INDEX idx_grades_division ON grades(division_id);
CREATE INDEX idx_grades_code ON grades(code);
CREATE INDEX idx_grades_niveau ON grades(niveau);

-- =====================================================
-- 2. RESTRUCTURATION DE LA TABLE USERS (comptes d'accès uniquement)
-- =====================================================
-- Supprimer les colonnes liées aux collaborateurs
ALTER TABLE users DROP COLUMN IF EXISTS nom;
ALTER TABLE users DROP COLUMN IF EXISTS prenom;
ALTER TABLE users DROP COLUMN IF EXISTS initiales;
ALTER TABLE users DROP COLUMN IF EXISTS grade;
ALTER TABLE users DROP COLUMN IF EXISTS division_id;
ALTER TABLE users DROP COLUMN IF EXISTS date_embauche;
ALTER TABLE users DROP COLUMN IF EXISTS taux_horaire;

-- Ajouter la liaison vers collaborateur
ALTER TABLE users ADD COLUMN IF NOT EXISTS collaborateur_id UUID;

-- =====================================================
-- 3. CRÉATION DE LA TABLE COLLABORATEURS
-- =====================================================
CREATE TABLE IF NOT EXISTS collaborateurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricule VARCHAR(20) UNIQUE,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    initiales VARCHAR(10) NOT NULL, -- Initiales du nom
    email VARCHAR(255) UNIQUE,
    telephone VARCHAR(20),
    date_embauche DATE NOT NULL,
    date_depart DATE,
    division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
    grade_actuel_id UUID REFERENCES grades(id) ON DELETE SET NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'ACTIF' CHECK (statut IN ('ACTIF', 'INACTIF', 'CONGE', 'DEPART')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les collaborateurs
CREATE INDEX idx_collaborateurs_division ON collaborateurs(division_id);
CREATE INDEX idx_collaborateurs_grade ON collaborateurs(grade_actuel_id);
CREATE INDEX idx_collaborateurs_matricule ON collaborateurs(matricule);
CREATE INDEX idx_collaborateurs_initiales ON collaborateurs(initiales);
CREATE INDEX idx_collaborateurs_statut ON collaborateurs(statut);

-- =====================================================
-- 4. CRÉATION DE LA TABLE ÉVOLUTION DES GRADES
-- =====================================================
CREATE TABLE IF NOT EXISTS evolution_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaborateur_id UUID NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
    grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
    date_debut DATE NOT NULL,
    date_fin DATE,
    taux_horaire_personnalise DECIMAL(10,2),
    motif TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour l'évolution des grades
CREATE INDEX idx_evolution_grades_collaborateur ON evolution_grades(collaborateur_id);
CREATE INDEX idx_evolution_grades_grade ON evolution_grades(grade_id);
CREATE INDEX idx_evolution_grades_dates ON evolution_grades(date_debut, date_fin);

-- =====================================================
-- 5. CRÉATION DE LA TABLE TYPES D'HEURES NON CHARGEABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS types_heures_non_chargeables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    division_id UUID REFERENCES divisions(id) ON DELETE CASCADE,
    description TEXT,
    statut VARCHAR(20) NOT NULL DEFAULT 'ACTIF' CHECK (statut IN ('ACTIF', 'INACTIF')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les types d'heures non chargeables
CREATE INDEX idx_types_heures_division ON types_heures_non_chargeables(division_id);
CREATE INDEX idx_types_heures_code ON types_heures_non_chargeables(code);

-- =====================================================
-- 6. RESTRUCTURATION DE LA TABLE TIME_ENTRIES
-- =====================================================
-- Ajouter les nouveaux champs
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS type_heures VARCHAR(20) NOT NULL DEFAULT 'CHARGEABLE' CHECK (type_heures IN ('CHARGEABLE', 'NON_CHARGEABLE'));
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS type_non_chargeable_id UUID REFERENCES types_heures_non_chargeables(id) ON DELETE SET NULL;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS date_saisie DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS semaine INTEGER; -- Numéro de semaine
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS annee INTEGER; -- Année
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS statut_validation VARCHAR(20) NOT NULL DEFAULT 'SAISIE' CHECK (statut_validation IN ('SAISIE', 'SOUMISE', 'VALIDEE', 'REJETEE'));
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS validateur_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS date_validation TIMESTAMP WITH TIME ZONE;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS commentaire_validation TEXT;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS taux_horaire_applique DECIMAL(10,2);

-- Modifier les contraintes existantes
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_mission_id_fkey;
ALTER TABLE time_entries ADD CONSTRAINT time_entries_mission_id_fkey 
    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE;

-- Index pour les time entries
CREATE INDEX IF NOT EXISTS idx_time_entries_type ON time_entries(type_heures);
CREATE INDEX IF NOT EXISTS idx_time_entries_date_saisie ON time_entries(date_saisie);
CREATE INDEX IF NOT EXISTS idx_time_entries_semaine_annee ON time_entries(semaine, annee);
CREATE INDEX IF NOT EXISTS idx_time_entries_statut_validation ON time_entries(statut_validation);
CREATE INDEX IF NOT EXISTS idx_time_entries_validateur ON time_entries(validateur_id);

-- =====================================================
-- 7. RESTRUCTURATION DE LA TABLE MISSIONS
-- =====================================================
-- Ajouter les champs pour le workflow prospect
ALTER TABLE missions ADD COLUMN IF NOT EXISTS type_mission VARCHAR(20) NOT NULL DEFAULT 'MISSION' CHECK (type_mission IN ('PROSPECT', 'CONTACT', 'PROPOSITION', 'MISSION', 'WIN', 'LOST', 'ABANDONNE'));
ALTER TABLE missions ADD COLUMN IF NOT EXISTS prospect_id UUID REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS date_contact DATE;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS date_proposition DATE;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS date_decision DATE;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS montant_proposition DECIMAL(15,2);
ALTER TABLE missions ADD COLUMN IF NOT EXISTS probabilite INTEGER CHECK (probabilite >= 0 AND probabilite <= 100);
ALTER TABLE missions ADD COLUMN IF NOT EXISTS motif_perte TEXT;

-- Index pour les missions
CREATE INDEX IF NOT EXISTS idx_missions_type ON missions(type_mission);
CREATE INDEX IF NOT EXISTS idx_missions_prospect ON missions(prospect_id);
CREATE INDEX IF NOT EXISTS idx_missions_dates_workflow ON missions(date_contact, date_proposition, date_decision);

-- =====================================================
-- 8. RESTRUCTURATION DE LA TABLE CLIENTS
-- =====================================================
-- Ajouter les champs pour l'évolution prospect → client
ALTER TABLE clients ADD COLUMN IF NOT EXISTS date_premier_contact DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS date_devenu_client DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS source_prospect VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS commercial_responsable_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL;

-- Index pour les clients
CREATE INDEX IF NOT EXISTS idx_clients_dates_evolution ON clients(date_premier_contact, date_devenu_client);
CREATE INDEX IF NOT EXISTS idx_clients_commercial ON clients(commercial_responsable_id);

-- =====================================================
-- 9. CRÉATION DE LA TABLE FEUILLES DE TEMPS
-- =====================================================
CREATE TABLE IF NOT EXISTS feuilles_temps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaborateur_id UUID NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
    semaine INTEGER NOT NULL,
    annee INTEGER NOT NULL,
    date_debut_semaine DATE NOT NULL,
    date_fin_semaine DATE NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'BROUILLON' CHECK (statut IN ('BROUILLON', 'SOUMISE', 'VALIDEE', 'REJETEE')),
    validateur_id UUID REFERENCES users(id) ON DELETE SET NULL,
    date_soumission TIMESTAMP WITH TIME ZONE,
    date_validation TIMESTAMP WITH TIME ZONE,
    commentaire_validation TEXT,
    total_heures_chargeables DECIMAL(8,2) DEFAULT 0.00,
    total_heures_non_chargeables DECIMAL(8,2) DEFAULT 0.00,
    total_heures_semaine DECIMAL(8,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(collaborateur_id, semaine, annee)
);

-- Index pour les feuilles de temps
CREATE INDEX idx_feuilles_temps_collaborateur ON feuilles_temps(collaborateur_id);
CREATE INDEX idx_feuilles_temps_semaine_annee ON feuilles_temps(semaine, annee);
CREATE INDEX idx_feuilles_temps_statut ON feuilles_temps(statut);
CREATE INDEX idx_feuilles_temps_validateur ON feuilles_temps(validateur_id);

-- =====================================================
-- 10. CRÉATION DE LA TABLE LIAISON FEUILLES-TIME_ENTRIES
-- =====================================================
CREATE TABLE IF NOT EXISTS feuille_temps_entries (
    feuille_temps_id UUID NOT NULL REFERENCES feuilles_temps(id) ON DELETE CASCADE,
    time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (feuille_temps_id, time_entry_id)
);

-- Index pour la liaison
CREATE INDEX idx_feuille_temps_entries_feuille ON feuille_temps_entries(feuille_temps_id);
CREATE INDEX idx_feuille_temps_entries_entry ON feuille_temps_entries(time_entry_id);

-- =====================================================
-- 11. AJOUT DES CONTRAINTES DE VALIDATION
-- =====================================================

-- Contrainte pour les time entries : mission_id obligatoire si type_heures = 'CHARGEABLE'
ALTER TABLE time_entries ADD CONSTRAINT check_mission_required_for_chargeable 
    CHECK (type_heures != 'CHARGEABLE' OR mission_id IS NOT NULL);

-- Contrainte pour les time entries : type_non_chargeable_id obligatoire si type_heures = 'NON_CHARGEABLE'
ALTER TABLE time_entries ADD CONSTRAINT check_type_required_for_non_chargeable 
    CHECK (type_heures != 'NON_CHARGEABLE' OR type_non_chargeable_id IS NOT NULL);

-- Contrainte pour les dates de workflow des missions
ALTER TABLE missions ADD CONSTRAINT check_workflow_dates 
    CHECK (
        (type_mission = 'PROSPECT' AND date_contact IS NULL) OR
        (type_mission = 'CONTACT' AND date_contact IS NOT NULL) OR
        (type_mission = 'PROPOSITION' AND date_contact IS NOT NULL AND date_proposition IS NOT NULL) OR
        (type_mission IN ('MISSION', 'WIN', 'LOST') AND date_contact IS NOT NULL AND date_proposition IS NOT NULL AND date_decision IS NOT NULL)
    );

-- =====================================================
-- 12. DONNÉES INITIALES POUR LES GRADES
-- =====================================================
INSERT INTO grades (nom, code, taux_horaire_default, niveau, description) 
SELECT 'Assistant', 'ASSISTANT', 50.00, 1, 'Assistant junior'
WHERE NOT EXISTS (SELECT 1 FROM grades WHERE code = 'ASSISTANT');

INSERT INTO grades (nom, code, taux_horaire_default, niveau, description) 
SELECT 'Senior Assistant', 'SENIOR_ASSISTANT', 65.00, 2, 'Assistant senior'
WHERE NOT EXISTS (SELECT 1 FROM grades WHERE code = 'SENIOR_ASSISTANT');

INSERT INTO grades (nom, code, taux_horaire_default, niveau, description) 
SELECT 'Manager', 'MANAGER', 85.00, 3, 'Manager'
WHERE NOT EXISTS (SELECT 1 FROM grades WHERE code = 'MANAGER');

INSERT INTO grades (nom, code, taux_horaire_default, niveau, description) 
SELECT 'Senior Manager', 'SENIOR_MANAGER', 110.00, 4, 'Manager senior'
WHERE NOT EXISTS (SELECT 1 FROM grades WHERE code = 'SENIOR_MANAGER');

INSERT INTO grades (nom, code, taux_horaire_default, niveau, description) 
SELECT 'Director', 'DIRECTOR', 140.00, 5, 'Directeur'
WHERE NOT EXISTS (SELECT 1 FROM grades WHERE code = 'DIRECTOR');

INSERT INTO grades (nom, code, taux_horaire_default, niveau, description) 
SELECT 'Partner', 'PARTNER', 200.00, 6, 'Associé'
WHERE NOT EXISTS (SELECT 1 FROM grades WHERE code = 'PARTNER');

-- =====================================================
-- 13. DONNÉES INITIALES POUR LES TYPES D'HEURES NON CHARGEABLES
-- =====================================================
INSERT INTO types_heures_non_chargeables (nom, code, description) 
SELECT 'Formation', 'FORMATION', 'Formation interne ou externe'
WHERE NOT EXISTS (SELECT 1 FROM types_heures_non_chargeables WHERE code = 'FORMATION');

INSERT INTO types_heures_non_chargeables (nom, code, description) 
SELECT 'Administration', 'ADMIN', 'Tâches administratives'
WHERE NOT EXISTS (SELECT 1 FROM types_heures_non_chargeables WHERE code = 'ADMIN');

INSERT INTO types_heures_non_chargeables (nom, code, description) 
SELECT 'Réunion interne', 'REUNION_INT', 'Réunions internes'
WHERE NOT EXISTS (SELECT 1 FROM types_heures_non_chargeables WHERE code = 'REUNION_INT');

INSERT INTO types_heures_non_chargeables (nom, code, description) 
SELECT 'Développement commercial', 'DEV_COM', 'Développement commercial'
WHERE NOT EXISTS (SELECT 1 FROM types_heures_non_chargeables WHERE code = 'DEV_COM');

INSERT INTO types_heures_non_chargeables (nom, code, description) 
SELECT 'Recherche et développement', 'R_D', 'Recherche et développement'
WHERE NOT EXISTS (SELECT 1 FROM types_heures_non_chargeables WHERE code = 'R_D');

INSERT INTO types_heures_non_chargeables (nom, code, description) 
SELECT 'Congé', 'CONGE', 'Congés et absences'
WHERE NOT EXISTS (SELECT 1 FROM types_heures_non_chargeables WHERE code = 'CONGE');

INSERT INTO types_heures_non_chargeables (nom, code, description) 
SELECT 'Autre', 'AUTRE', 'Autres activités non chargeables'
WHERE NOT EXISTS (SELECT 1 FROM types_heures_non_chargeables WHERE code = 'AUTRE');

-- =====================================================
-- 14. MISE À JOUR DES TRIGGERS
-- =====================================================

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Appliquer le trigger aux nouvelles tables
CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON grades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collaborateurs_updated_at BEFORE UPDATE ON collaborateurs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_types_heures_updated_at BEFORE UPDATE ON types_heures_non_chargeables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feuilles_temps_updated_at BEFORE UPDATE ON feuilles_temps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 15. COMMENTAIRES POUR LA DOCUMENTATION
-- =====================================================
COMMENT ON TABLE grades IS 'Grades hiérarchiques par division avec taux horaires par défaut';
COMMENT ON TABLE collaborateurs IS 'Employés de l''entreprise avec leurs données RH';
COMMENT ON TABLE evolution_grades IS 'Historique de l''évolution des grades des collaborateurs';
COMMENT ON TABLE types_heures_non_chargeables IS 'Types d''heures non chargeables variables par division';
COMMENT ON TABLE feuilles_temps IS 'Feuilles de temps hebdomadaires des collaborateurs';
COMMENT ON TABLE feuille_temps_entries IS 'Liaison entre feuilles de temps et saisies de temps';

COMMENT ON COLUMN collaborateurs.initiales IS 'Initiales du nom du collaborateur';
COMMENT ON COLUMN time_entries.type_heures IS 'Type d''heures : CHARGEABLE (mission) ou NON_CHARGEABLE';
COMMENT ON COLUMN time_entries.semaine IS 'Numéro de semaine ISO (1-53)';
COMMENT ON COLUMN time_entries.annee IS 'Année de la saisie';
COMMENT ON COLUMN missions.type_mission IS 'Type de mission dans le workflow prospect → client';
COMMENT ON COLUMN missions.probabilite IS 'Probabilité de gain en pourcentage (0-100)'; 