-- Migration 007: Création des tables clients et missions
-- Date: 2025-07-18

-- Table des clients/prospects
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telephone VARCHAR(50),
    adresse TEXT,
    ville VARCHAR(100),
    code_postal VARCHAR(20),
    pays VARCHAR(100) DEFAULT 'France',
    secteur_activite VARCHAR(100),
    taille_entreprise VARCHAR(50), -- PME, Grande entreprise, etc.
    statut VARCHAR(50) NOT NULL DEFAULT 'prospect', -- prospect, client, client_fidele, abandonne
    source_prospection VARCHAR(100), -- recommandation, salon, web, etc.
    notes TEXT,
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_derniere_activite TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    collaborateur_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Table des missions
CREATE TABLE IF NOT EXISTS missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    statut VARCHAR(50) NOT NULL DEFAULT 'en_cours', -- en_cours, termine, suspendu, annule
    type_mission VARCHAR(100), -- audit, conseil, formation, developpement, etc.
    date_debut DATE,
    date_fin_prevue DATE,
    date_fin_reelle DATE,
    budget_prevue DECIMAL(12,2),
    budget_reel DECIMAL(12,2),
    taux_horaire_moyen DECIMAL(8,2), -- taux horaire moyen de l'équipe
    montant_total DECIMAL(12,2), -- montant total facturé
    priorite VARCHAR(20) DEFAULT 'normale', -- basse, normale, haute, urgente
    division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
    responsable_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL,
    notes TEXT,
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Table des équipes de mission (collaborateurs assignés à une mission)
CREATE TABLE IF NOT EXISTS equipes_mission (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    collaborateur_id UUID NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
    role VARCHAR(100), -- chef de projet, consultant, expert, etc.
    taux_horaire_mission DECIMAL(8,2), -- taux horaire spécifique pour cette mission
    date_debut_participation DATE,
    date_fin_participation DATE,
    pourcentage_charge DECIMAL(5,2) DEFAULT 100.00, -- pourcentage de charge sur la mission
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mission_id, collaborateur_id)
);

-- Table des opportunités (étapes de conversion prospect -> client)
CREATE TABLE IF NOT EXISTS opportunites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    statut VARCHAR(50) NOT NULL DEFAULT 'identification', -- identification, contact, proposition, negociation, win, lost
    probabilite DECIMAL(5,2) DEFAULT 0.00, -- pourcentage de probabilité de succès
    montant_estime DECIMAL(12,2),
    date_limite DATE,
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_fermeture TIMESTAMP WITH TIME ZONE,
    raison_fermeture VARCHAR(255), -- pour les opportunités perdues
    collaborateur_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_clients_statut ON clients(statut);
CREATE INDEX IF NOT EXISTS idx_clients_collaborateur ON clients(collaborateur_id);
CREATE INDEX IF NOT EXISTS idx_clients_date_creation ON clients(date_creation);
CREATE INDEX IF NOT EXISTS idx_missions_client ON missions(client_id);
CREATE INDEX IF NOT EXISTS idx_missions_statut ON missions(statut);
CREATE INDEX IF NOT EXISTS idx_missions_division ON missions(division_id);
CREATE INDEX IF NOT EXISTS idx_missions_responsable ON missions(responsable_id);
CREATE INDEX IF NOT EXISTS idx_missions_dates ON missions(date_debut, date_fin_prevue);
CREATE INDEX IF NOT EXISTS idx_equipes_mission_mission ON equipes_mission(mission_id);
CREATE INDEX IF NOT EXISTS idx_equipes_mission_collaborateur ON equipes_mission(collaborateur_id);
CREATE INDEX IF NOT EXISTS idx_opportunites_client ON opportunites(client_id);
CREATE INDEX IF NOT EXISTS idx_opportunites_statut ON opportunites(statut);
CREATE INDEX IF NOT EXISTS idx_opportunites_collaborateur ON opportunites(collaborateur_id);

-- Triggers pour mettre à jour les dates de modification
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_modification = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_clients_modification 
    BEFORE UPDATE ON clients 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER IF NOT EXISTS update_missions_modification 
    BEFORE UPDATE ON missions 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER IF NOT EXISTS update_equipes_mission_modification 
    BEFORE UPDATE ON equipes_mission 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER IF NOT EXISTS update_opportunites_modification 
    BEFORE UPDATE ON opportunites 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Insertion de données de test pour les clients
INSERT INTO clients (nom, email, telephone, ville, secteur_activite, statut, source_prospection) VALUES
('Entreprise ABC', 'contact@abc.fr', '01 23 45 67 89', 'Paris', 'Technologie', 'client', 'recommandation'),
('Startup XYZ', 'hello@xyz.com', '04 56 78 90 12', 'Lyon', 'Finance', 'prospect', 'salon'),
('Groupe DEF', 'info@def.com', '02 34 56 78 90', 'Marseille', 'Industrie', 'client_fidele', 'web'),
('PME GHI', 'contact@ghi.fr', '03 45 67 89 01', 'Toulouse', 'Services', 'prospect', 'salon'),
('Corporation JKL', 'info@jkl.com', '05 67 89 01 23', 'Nantes', 'Logistique', 'client', 'recommandation')
ON CONFLICT DO NOTHING;

-- Insertion de données de test pour les missions
INSERT INTO missions (titre, description, client_id, statut, type_mission, date_debut, date_fin_prevue, budget_prevue, priorite) 
SELECT 
    'Audit organisationnel ' || c.nom,
    'Audit complet de l''organisation et des processus',
    c.id,
    'en_cours',
    'audit',
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE + INTERVAL '60 days',
    15000.00,
    'normale'
FROM clients c 
WHERE c.statut IN ('client', 'client_fidele')
LIMIT 3
ON CONFLICT DO NOTHING;

-- Insertion de données de test pour les opportunités
INSERT INTO opportunites (titre, description, client_id, statut, probabilite, montant_estime, date_limite)
SELECT 
    'Projet de transformation ' || c.nom,
    'Accompagnement dans la transformation digitale',
    c.id,
    'proposition',
    75.00,
    25000.00,
    CURRENT_DATE + INTERVAL '90 days'
FROM clients c 
WHERE c.statut = 'prospect'
LIMIT 2
ON CONFLICT DO NOTHING;

-- Mise à jour de la table clients pour ajouter des collaborateurs responsables
UPDATE clients 
SET collaborateur_id = (SELECT id FROM collaborateurs ORDER BY created_at LIMIT 1)
WHERE collaborateur_id IS NULL;

-- Mise à jour de la table missions pour ajouter des responsables
UPDATE missions 
SET responsable_id = (SELECT id FROM collaborateurs ORDER BY created_at LIMIT 1)
WHERE responsable_id IS NULL; 