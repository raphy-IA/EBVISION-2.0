-- Migration 029: Création des tables pour la gestion des tâches
-- Date: 2025-07-31

-- Création de la table tasks
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    libelle VARCHAR(255) NOT NULL,
    description TEXT,
    duree_estimee INTEGER DEFAULT 0, -- durée en heures
    priorite VARCHAR(20) DEFAULT 'MOYENNE' CHECK (priorite IN ('BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE')),
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Création de la table de liaison task_mission_types
CREATE TABLE IF NOT EXISTS task_mission_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    mission_type_id UUID NOT NULL REFERENCES mission_types(id) ON DELETE CASCADE,
    ordre INTEGER DEFAULT 0,
    obligatoire BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, mission_type_id)
);

-- Création de la table mission_tasks (tâches d'une mission spécifique)
CREATE TABLE IF NOT EXISTS mission_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    statut VARCHAR(20) DEFAULT 'PLANIFIEE' CHECK (statut IN ('PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE')),
    date_debut DATE,
    date_fin DATE,
    duree_planifiee INTEGER DEFAULT 0, -- heures planifiées
    duree_reelle INTEGER DEFAULT 0, -- heures réelles
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mission_id, task_id)
);

-- Création de la table task_assignments (assignations personnel)
CREATE TABLE IF NOT EXISTS task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_task_id UUID NOT NULL REFERENCES mission_tasks(id) ON DELETE CASCADE,
    collaborateur_id UUID NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
    heures_planifiees INTEGER DEFAULT 0,
    heures_effectuees INTEGER DEFAULT 0,
    taux_horaire DECIMAL(10,2) DEFAULT 0.00,
    statut VARCHAR(20) DEFAULT 'PLANIFIE' CHECK (statut IN ('PLANIFIE', 'EN_COURS', 'TERMINE')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mission_task_id, collaborateur_id)
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_tasks_code ON tasks(code);
CREATE INDEX IF NOT EXISTS idx_tasks_actif ON tasks(actif);
CREATE INDEX IF NOT EXISTS idx_task_mission_types_task_id ON task_mission_types(task_id);
CREATE INDEX IF NOT EXISTS idx_task_mission_types_mission_type_id ON task_mission_types(mission_type_id);
CREATE INDEX IF NOT EXISTS idx_mission_tasks_mission_id ON mission_tasks(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_tasks_task_id ON mission_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_mission_tasks_statut ON mission_tasks(statut);
CREATE INDEX IF NOT EXISTS idx_task_assignments_mission_task_id ON task_assignments(mission_task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_collaborateur_id ON task_assignments(collaborateur_id);

-- Trigger pour updated_at sur tasks
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_modified_column();

-- Trigger pour updated_at sur mission_tasks
CREATE TRIGGER update_mission_tasks_updated_at 
    BEFORE UPDATE ON mission_tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_modified_column();

-- Trigger pour updated_at sur task_assignments
CREATE TRIGGER update_task_assignments_updated_at 
    BEFORE UPDATE ON task_assignments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_modified_column();

-- Données de test pour les tâches
INSERT INTO tasks (code, libelle, description, duree_estimee, priorite) VALUES
('AUDIT_COMPTES', 'Audit des comptes', 'Vérification et analyse des comptes clients', 40, 'HAUTE'),
('VERIF_FISCALE', 'Vérification fiscale', 'Contrôle de la conformité fiscale', 24, 'HAUTE'),
('RAPPORT_FINAL', 'Rapport final', 'Rédaction du rapport d''audit final', 16, 'CRITIQUE'),
('CONSEIL_STRATEGIE', 'Conseil en stratégie', 'Accompagnement stratégique du client', 32, 'HAUTE'),
('FORMATION_EQUIPE', 'Formation de l''équipe', 'Formation du personnel client', 20, 'MOYENNE'),
('ANALYSE_RISQUES', 'Analyse des risques', 'Évaluation des risques financiers', 28, 'HAUTE'),
('OPTIMISATION_PROCESS', 'Optimisation des processus', 'Amélioration des processus internes', 36, 'MOYENNE'),
('CONTROLE_INTERNE', 'Contrôle interne', 'Mise en place de contrôles internes', 24, 'HAUTE'),
('PLANIFICATION_FISCALE', 'Planification fiscale', 'Optimisation fiscale et planification', 32, 'CRITIQUE'),
('SUIVI_CONFORMITE', 'Suivi de conformité', 'Monitoring de la conformité réglementaire', 16, 'MOYENNE');

-- Association des tâches aux types de mission
INSERT INTO task_mission_types (task_id, mission_type_id, ordre, obligatoire) VALUES
-- AU003: Audit des formes juridiques
((SELECT id FROM tasks WHERE code = 'AUDIT_COMPTES'), (SELECT id FROM mission_types WHERE codification = 'AU003'), 1, true),
((SELECT id FROM tasks WHERE code = 'VERIF_FISCALE'), (SELECT id FROM mission_types WHERE codification = 'AU003'), 2, true),
((SELECT id FROM tasks WHERE code = 'RAPPORT_FINAL'), (SELECT id FROM mission_types WHERE codification = 'AU003'), 3, true),
((SELECT id FROM tasks WHERE code = 'ANALYSE_RISQUES'), (SELECT id FROM mission_types WHERE codification = 'AU003'), 4, false),

-- BA001: Audit des actifs de sécurité
((SELECT id FROM tasks WHERE code = 'AUDIT_COMPTES'), (SELECT id FROM mission_types WHERE codification = 'BA001'), 1, true),
((SELECT id FROM tasks WHERE code = 'CONTROLE_INTERNE'), (SELECT id FROM mission_types WHERE codification = 'BA001'), 2, true),
((SELECT id FROM tasks WHERE code = 'RAPPORT_FINAL'), (SELECT id FROM mission_types WHERE codification = 'BA001'), 3, true),

-- CONSEIL
((SELECT id FROM tasks WHERE code = 'CONSEIL_STRATEGIE'), (SELECT id FROM mission_types WHERE codification = 'CONSEIL'), 1, true),
((SELECT id FROM tasks WHERE code = 'ANALYSE_RISQUES'), (SELECT id FROM mission_types WHERE codification = 'CONSEIL'), 2, false),
((SELECT id FROM tasks WHERE code = 'OPTIMISATION_PROCESS'), (SELECT id FROM mission_types WHERE codification = 'CONSEIL'), 3, false),

-- DEV: Développement
((SELECT id FROM tasks WHERE code = 'OPTIMISATION_PROCESS'), (SELECT id FROM mission_types WHERE codification = 'DEV'), 1, true),
((SELECT id FROM tasks WHERE code = 'FORMATION_EQUIPE'), (SELECT id FROM mission_types WHERE codification = 'DEV'), 2, false),

-- FINANCE
((SELECT id FROM tasks WHERE code = 'AUDIT_COMPTES'), (SELECT id FROM mission_types WHERE codification = 'FINANCE'), 1, true),
((SELECT id FROM tasks WHERE code = 'ANALYSE_RISQUES'), (SELECT id FROM mission_types WHERE codification = 'FINANCE'), 2, true),
((SELECT id FROM tasks WHERE code = 'RAPPORT_FINAL'), (SELECT id FROM mission_types WHERE codification = 'FINANCE'), 3, true),

-- FISCAL
((SELECT id FROM tasks WHERE code = 'VERIF_FISCALE'), (SELECT id FROM mission_types WHERE codification = 'FISCAL'), 1, true),
((SELECT id FROM tasks WHERE code = 'PLANIFICATION_FISCALE'), (SELECT id FROM mission_types WHERE codification = 'FISCAL'), 2, true),
((SELECT id FROM tasks WHERE code = 'SUIVI_CONFORMITE'), (SELECT id FROM mission_types WHERE codification = 'FISCAL'), 3, false),

-- FORMATION
((SELECT id FROM tasks WHERE code = 'FORMATION_EQUIPE'), (SELECT id FROM mission_types WHERE codification = 'FORMATION'), 1, true),

-- JURIDIQUE
((SELECT id FROM tasks WHERE code = 'CONSEIL_STRATEGIE'), (SELECT id FROM mission_types WHERE codification = 'JURIDIQUE'), 1, true),
((SELECT id FROM tasks WHERE code = 'ANALYSE_RISQUES'), (SELECT id FROM mission_types WHERE codification = 'JURIDIQUE'), 2, false);

COMMIT; 