-- Migration pour créer le système d'activités et de feuilles de temps
-- Basé sur les spécifications du cahier des charges

-- 1. TABLE DES ACTIVITÉS (autres que les missions)
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
    type_activite VARCHAR(50) NOT NULL DEFAULT 'ADMINISTRATIF' CHECK (type_activite IN (
        'ADMINISTRATIF', 'FORMATION', 'CONGE', 'MALADIE', 'FERIE', 'DEPLACEMENT', 'AUTRE'
    )),
    obligatoire BOOLEAN DEFAULT false,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les activités
CREATE INDEX idx_activities_business_unit ON activities(business_unit_id);
CREATE INDEX idx_activities_type ON activities(type_activite);
CREATE INDEX idx_activities_actif ON activities(actif);

-- 2. TABLE DES FEUILLES DE TEMPS HEBDOMADAIRES
CREATE TABLE IF NOT EXISTS time_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaborateur_id UUID NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
    semaine INTEGER NOT NULL CHECK (semaine >= 1 AND semaine <= 53),
    annee INTEGER NOT NULL,
    date_debut_semaine DATE NOT NULL,
    date_fin_semaine DATE NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'BROUILLON' CHECK (statut IN (
        'BROUILLON', 'EN_COURS', 'SOUMISE', 'VALIDEE', 'REJETEE'
    )),
    total_heures DECIMAL(10,2) DEFAULT 0,
    total_heures_chargeables DECIMAL(10,2) DEFAULT 0,
    total_heures_non_chargeables DECIMAL(10,2) DEFAULT 0,
    commentaire TEXT,
    validateur_id UUID REFERENCES users(id) ON DELETE SET NULL,
    date_soumission TIMESTAMP WITH TIME ZONE,
    date_validation TIMESTAMP WITH TIME ZONE,
    commentaire_validation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Contrainte d'unicité par collaborateur/semaine/année
    UNIQUE(collaborateur_id, semaine, annee)
);

-- Index pour les feuilles de temps
CREATE INDEX idx_time_sheets_collaborateur ON time_sheets(collaborateur_id);
CREATE INDEX idx_time_sheets_semaine_annee ON time_sheets(semaine, annee);
CREATE INDEX idx_time_sheets_statut ON time_sheets(statut);
CREATE INDEX idx_time_sheets_validateur ON time_sheets(validateur_id);

-- 3. TABLE DES SAISIES DE TEMPS DÉTAILLÉES
CREATE TABLE IF NOT EXISTS time_entries_detailed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time_sheet_id UUID NOT NULL REFERENCES time_sheets(id) ON DELETE CASCADE,
    date_saisie DATE NOT NULL,
    jour_semaine VARCHAR(10) NOT NULL, -- LUNDI, MARDI, etc.
    
    -- Type de saisie
    type_saisie VARCHAR(20) NOT NULL CHECK (type_saisie IN ('MISSION', 'ACTIVITE')),
    
    -- Référence mission (si type_saisie = 'MISSION')
    mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    
    -- Référence activité (si type_saisie = 'ACTIVITE')
    activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
    
    -- Heures
    heures_matin DECIMAL(4,2) DEFAULT 0 CHECK (heures_matin >= 0 AND heures_matin <= 12),
    heures_apres_midi DECIMAL(4,2) DEFAULT 0 CHECK (heures_apres_midi >= 0 AND heures_apres_midi <= 12),
    total_heures DECIMAL(4,2) GENERATED ALWAYS AS (heures_matin + heures_apres_midi) STORED,
    
    -- Description
    description_matin TEXT,
    description_apres_midi TEXT,
    
    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Contraintes
    CONSTRAINT check_mission_or_activity CHECK (
        (type_saisie = 'MISSION' AND mission_id IS NOT NULL) OR
        (type_saisie = 'ACTIVITE' AND activity_id IS NOT NULL)
    ),
    CONSTRAINT check_total_hours CHECK (total_heures <= 12)
);

-- Index pour les saisies détaillées
CREATE INDEX idx_time_entries_detailed_time_sheet ON time_entries_detailed(time_sheet_id);
CREATE INDEX idx_time_entries_detailed_date ON time_entries_detailed(date_saisie);
CREATE INDEX idx_time_entries_detailed_type ON time_entries_detailed(type_saisie);
CREATE INDEX idx_time_entries_detailed_mission ON time_entries_detailed(mission_id);
CREATE INDEX idx_time_entries_detailed_activity ON time_entries_detailed(activity_id);

-- 4. TABLE DES NOTIFICATIONS DE FEUILLES DE TEMPS
CREATE TABLE IF NOT EXISTS time_sheet_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaborateur_id UUID NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
    time_sheet_id UUID REFERENCES time_sheets(id) ON DELETE CASCADE,
    type_notification VARCHAR(50) NOT NULL CHECK (type_notification IN (
        'FEUILLE_INCOMPLETE', 'FEUILLE_NON_SOUMISE', 'FEUILLE_EN_RETARD', 'VALIDATION_REQUISE'
    )),
    message TEXT NOT NULL,
    semaine INTEGER,
    annee INTEGER,
    lu BOOLEAN DEFAULT false,
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_lecture TIMESTAMP WITH TIME ZONE
);

-- Index pour les notifications
CREATE INDEX idx_time_sheet_notifications_collaborateur ON time_sheet_notifications(collaborateur_id);
CREATE INDEX idx_time_sheet_notifications_lu ON time_sheet_notifications(lu);
CREATE INDEX idx_time_sheet_notifications_type ON time_sheet_notifications(type_notification);

-- 5. FONCTIONS UTILITAIRES

-- Fonction pour calculer le numéro de semaine ISO
CREATE OR REPLACE FUNCTION get_iso_week(date_input DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(WEEK FROM date_input);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les dates de début et fin de semaine
CREATE OR REPLACE FUNCTION get_week_dates(week_number INTEGER, year_number INTEGER)
RETURNS TABLE(date_debut DATE, date_fin DATE) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        date_debut::DATE,
        (date_debut + INTERVAL '6 days')::DATE as date_fin
    FROM (
        SELECT 
            DATE_TRUNC('week', TO_DATE(year_number || '-' || week_number || '-1', 'IYYY-IW-ID')) + INTERVAL '1 day' as date_debut
    ) as week_dates;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer automatiquement une feuille de temps
CREATE OR REPLACE FUNCTION create_time_sheet_if_not_exists(
    p_collaborateur_id UUID,
    p_semaine INTEGER,
    p_annee INTEGER
)
RETURNS UUID AS $$
DECLARE
    v_time_sheet_id UUID;
    v_date_debut DATE;
    v_date_fin DATE;
BEGIN
    -- Vérifier si la feuille existe déjà
    SELECT id INTO v_time_sheet_id
    FROM time_sheets
    WHERE collaborateur_id = p_collaborateur_id 
    AND semaine = p_semaine 
    AND annee = p_annee;
    
    -- Si elle n'existe pas, la créer
    IF v_time_sheet_id IS NULL THEN
        -- Calculer les dates de début et fin de semaine
        SELECT date_debut, date_fin INTO v_date_debut, v_date_fin
        FROM get_week_dates(p_semaine, p_annee);
        
        INSERT INTO time_sheets (
            collaborateur_id, semaine, annee, date_debut_semaine, date_fin_semaine
        ) VALUES (
            p_collaborateur_id, p_semaine, p_annee, v_date_debut, v_date_fin
        ) RETURNING id INTO v_time_sheet_id;
    END IF;
    
    RETURN v_time_sheet_id;
END;
$$ LANGUAGE plpgsql;

-- 6. TRIGGERS

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER trigger_update_activities_updated_at
    BEFORE UPDATE ON activities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_time_sheets_updated_at
    BEFORE UPDATE ON time_sheets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_time_entries_detailed_updated_at
    BEFORE UPDATE ON time_entries_detailed
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour recalculer les totaux de la feuille de temps
CREATE OR REPLACE FUNCTION update_time_sheet_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_total_heures DECIMAL(10,2) := 0;
    v_total_chargeables DECIMAL(10,2) := 0;
    v_total_non_chargeables DECIMAL(10,2) := 0;
BEGIN
    -- Calculer les totaux
    SELECT 
        COALESCE(SUM(total_heures), 0),
        COALESCE(SUM(CASE WHEN type_saisie = 'MISSION' THEN total_heures ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type_saisie = 'ACTIVITE' THEN total_heures ELSE 0 END), 0)
    INTO v_total_heures, v_total_chargeables, v_total_non_chargeables
    FROM time_entries_detailed
    WHERE time_sheet_id = NEW.time_sheet_id;
    
    -- Mettre à jour la feuille de temps
    UPDATE time_sheets 
    SET 
        total_heures = v_total_heures,
        total_heures_chargeables = v_total_chargeables,
        total_heures_non_chargeables = v_total_non_chargeables,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.time_sheet_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_time_sheet_totals_insert
    AFTER INSERT ON time_entries_detailed
    FOR EACH ROW
    EXECUTE FUNCTION update_time_sheet_totals();

CREATE TRIGGER trigger_update_time_sheet_totals_update
    AFTER UPDATE ON time_entries_detailed
    FOR EACH ROW
    EXECUTE FUNCTION update_time_sheet_totals();

CREATE TRIGGER trigger_update_time_sheet_totals_delete
    AFTER DELETE ON time_entries_detailed
    FOR EACH ROW
    EXECUTE FUNCTION update_time_sheet_totals();

-- 7. DONNÉES INITIALES

-- Insérer quelques activités de base
INSERT INTO activities (nom, description, business_unit_id, type_activite, obligatoire) VALUES
('Congé annuel', 'Congés payés et congés exceptionnels', (SELECT id FROM business_units LIMIT 1), 'CONGE', true),
('Congé maladie', 'Arrêts maladie et congés de maladie', (SELECT id FROM business_units LIMIT 1), 'MALADIE', true),
('Formation', 'Formations internes et externes', (SELECT id FROM business_units LIMIT 1), 'FORMATION', false),
('Administration', 'Tâches administratives diverses', (SELECT id FROM business_units LIMIT 1), 'ADMINISTRATIF', false),
('Déplacement', 'Déplacements professionnels', (SELECT id FROM business_units LIMIT 1), 'DEPLACEMENT', false),
('Jour férié', 'Jours fériés travaillés', (SELECT id FROM business_units LIMIT 1), 'FERIE', true)
ON CONFLICT DO NOTHING; 