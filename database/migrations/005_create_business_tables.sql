-- Migration 005: Création des tables métier pour les données CSV
-- Date: 2024-01-01
-- Description: Tables pour missions, factures, opportunités, saisies de temps

-- Table des missions
CREATE TABLE missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    nom VARCHAR(200) NOT NULL,
    description TEXT,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
    responsable_id UUID REFERENCES users(id) ON DELETE SET NULL,
    date_debut DATE,
    date_fin DATE,
    budget_estime DECIMAL(15,2) NOT NULL DEFAULT 0,
    budget_reel DECIMAL(15,2) NOT NULL DEFAULT 0,
    statut VARCHAR(20) NOT NULL DEFAULT 'EN_COURS' CHECK (statut IN ('EN_COURS', 'TERMINEE', 'ANNULEE', 'EN_ATTENTE')),
    priorite VARCHAR(20) NOT NULL DEFAULT 'NORMALE' CHECK (priorite IN ('BASSE', 'NORMALE', 'HAUTE', 'URGENTE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des saisies de temps (TRS)
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
    date_saisie DATE NOT NULL,
    heures DECIMAL(5,2) NOT NULL DEFAULT 0,
    type_heures VARCHAR(20) NOT NULL DEFAULT 'NORMALES' CHECK (type_heures IN ('NORMALES', 'SUPPLEMENTAIRES', 'NUIT', 'WEEKEND', 'FERIE')),
    description TEXT,
    perdiem DECIMAL(10,2) NOT NULL DEFAULT 0,
    transport DECIMAL(10,2) NOT NULL DEFAULT 0,
    hotel DECIMAL(10,2) NOT NULL DEFAULT 0,
    restaurant DECIMAL(10,2) NOT NULL DEFAULT 0,
    divers DECIMAL(10,2) NOT NULL DEFAULT 0,
    statut VARCHAR(20) NOT NULL DEFAULT 'SAISIE' CHECK (statut IN ('SAISIE', 'VALIDEE', 'REJETEE', 'FACTUREE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des factures
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero VARCHAR(50) NOT NULL UNIQUE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
    date_emission DATE NOT NULL,
    date_echeance DATE NOT NULL,
    montant_ht DECIMAL(15,2) NOT NULL DEFAULT 0,
    montant_tva DECIMAL(15,2) NOT NULL DEFAULT 0,
    montant_ttc DECIMAL(15,2) NOT NULL DEFAULT 0,
    statut VARCHAR(20) NOT NULL DEFAULT 'EMISE' CHECK (statut IN ('BROUILLON', 'EMISE', 'ENVOYEE', 'PAYEE', 'EN_RETARD', 'ANNULEE')),
    mode_paiement VARCHAR(50),
    date_paiement DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des opportunités commerciales
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(200) NOT NULL,
    description TEXT,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    prospect_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    montant_estime DECIMAL(15,2) NOT NULL DEFAULT 0,
    probabilite INTEGER NOT NULL DEFAULT 50 CHECK (probabilite >= 0 AND probabilite <= 100),
    date_creation DATE NOT NULL,
    date_fermeture_prevue DATE,
    date_fermeture_reelle DATE,
    source VARCHAR(100),
    statut VARCHAR(20) NOT NULL DEFAULT 'OUVERTE' CHECK (statut IN ('OUVERTE', 'GAGNEE', 'PERDUE', 'FERMEE')),
    responsable_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des taux horaires par grade
CREATE TABLE hourly_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grade VARCHAR(20) NOT NULL CHECK (grade IN ('ASSISTANT', 'SENIOR', 'MANAGER', 'DIRECTOR', 'PARTNER')),
    taux_horaire DECIMAL(10,2) NOT NULL,
    date_effet DATE NOT NULL,
    date_fin_effet DATE,
    statut VARCHAR(20) NOT NULL DEFAULT 'ACTIF' CHECK (statut IN ('ACTIF', 'INACTIF')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table de liaison factures-saisies de temps
CREATE TABLE invoice_time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
    montant_facture DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(invoice_id, time_entry_id)
);

-- Index pour optimiser les performances
CREATE INDEX idx_missions_code ON missions(code);
CREATE INDEX idx_missions_client ON missions(client_id);
CREATE INDEX idx_missions_statut ON missions(statut);
CREATE INDEX idx_missions_dates ON missions(date_debut, date_fin);

CREATE INDEX idx_time_entries_user ON time_entries(user_id);
CREATE INDEX idx_time_entries_mission ON time_entries(mission_id);
CREATE INDEX idx_time_entries_date ON time_entries(date_saisie);
CREATE INDEX idx_time_entries_statut ON time_entries(statut);

CREATE INDEX idx_invoices_numero ON invoices(numero);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_date_emission ON invoices(date_emission);
CREATE INDEX idx_invoices_statut ON invoices(statut);

CREATE INDEX idx_opportunities_nom ON opportunities(nom);
CREATE INDEX idx_opportunities_client ON opportunities(client_id);
CREATE INDEX idx_opportunities_statut ON opportunities(statut);
CREATE INDEX idx_opportunities_date_creation ON opportunities(date_creation);

CREATE INDEX idx_hourly_rates_grade ON hourly_rates(grade);
CREATE INDEX idx_hourly_rates_date_effet ON hourly_rates(date_effet);
CREATE INDEX idx_hourly_rates_statut ON hourly_rates(statut);

CREATE INDEX idx_invoice_time_entries_invoice ON invoice_time_entries(invoice_id);
CREATE INDEX idx_invoice_time_entries_time_entry ON invoice_time_entries(time_entry_id);

-- Triggers pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_missions_updated_at BEFORE UPDATE ON missions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hourly_rates_updated_at BEFORE UPDATE ON hourly_rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Contraintes de validation
ALTER TABLE missions ADD CONSTRAINT check_mission_dates CHECK (date_fin IS NULL OR date_fin >= date_debut);
ALTER TABLE invoices ADD CONSTRAINT check_invoice_dates CHECK (date_echeance >= date_emission);
ALTER TABLE opportunities ADD CONSTRAINT check_opportunity_dates CHECK (date_fermeture_prevue IS NULL OR date_fermeture_prevue >= date_creation);
ALTER TABLE hourly_rates ADD CONSTRAINT check_rate_dates CHECK (date_fin_effet IS NULL OR date_fin_effet >= date_effet); 