-- Migration 001: Création des tables de base (sans dépendances)
-- Date: 2024-01-01
-- Description: Création des tables de base sans clés étrangères

-- Extension pour les UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des rôles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des permissions
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des divisions/départements (sans responsable_id pour l'instant)
CREATE TABLE divisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE,
    budget_annuel DECIMAL(15,2) NOT NULL DEFAULT 0,
    statut VARCHAR(20) NOT NULL DEFAULT 'ACTIF' CHECK (statut IN ('ACTIF', 'INACTIF')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des années fiscales
CREATE TABLE fiscal_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    annee INTEGER NOT NULL UNIQUE,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    budget_global DECIMAL(15,2) NOT NULL DEFAULT 0,
    statut VARCHAR(20) NOT NULL DEFAULT 'OUVERTE' CHECK (statut IN ('OUVERTE', 'FERMEE', 'EN_COURS')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_dates CHECK (date_fin > date_debut)
);

-- Table des clients
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raison_sociale VARCHAR(200) NOT NULL,
    siret VARCHAR(14) NOT NULL UNIQUE,
    secteur_activite VARCHAR(100) NOT NULL,
    effectif INTEGER NOT NULL DEFAULT 1,
    ca_annuel DECIMAL(15,2) NOT NULL DEFAULT 0,
    adresse TEXT NOT NULL,
    pays VARCHAR(50) NOT NULL DEFAULT 'France',
    statut VARCHAR(20) NOT NULL DEFAULT 'PROSPECT' CHECK (statut IN ('PROSPECT', 'CLIENT', 'CLIENT_FIDELE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les performances
CREATE INDEX idx_divisions_code ON divisions(code);
CREATE INDEX idx_divisions_statut ON divisions(statut);

CREATE INDEX idx_fiscal_years_annee ON fiscal_years(annee);
CREATE INDEX idx_fiscal_years_statut ON fiscal_years(statut);

CREATE INDEX idx_clients_siret ON clients(siret);
CREATE INDEX idx_clients_statut ON clients(statut);
CREATE INDEX idx_clients_secteur ON clients(secteur_activite);

-- Triggers pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Application des triggers sur les tables de base
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_divisions_updated_at BEFORE UPDATE ON divisions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fiscal_years_updated_at BEFORE UPDATE ON fiscal_years FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 