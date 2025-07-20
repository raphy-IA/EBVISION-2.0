-- Migration 002: Création de la table users
-- Date: 2024-01-01
-- Description: Création de la table users avec dépendances

-- Table des utilisateurs/collaborateurs
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(50) NOT NULL,
    prenom VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    initiales VARCHAR(5) NOT NULL UNIQUE,
    grade VARCHAR(20) NOT NULL CHECK (grade IN ('ASSISTANT', 'SENIOR', 'MANAGER', 'DIRECTOR', 'PARTNER')),
    division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
    date_embauche DATE NOT NULL,
    taux_horaire DECIMAL(10,2) NOT NULL DEFAULT 0,
    statut VARCHAR(20) NOT NULL DEFAULT 'ACTIF' CHECK (statut IN ('ACTIF', 'INACTIF', 'CONGE')),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les performances
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_division ON users(division_id);
CREATE INDEX idx_users_grade ON users(grade);
CREATE INDEX idx_users_statut ON users(statut);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ajouter la colonne responsable_id à la table divisions
ALTER TABLE divisions ADD COLUMN responsable_id UUID REFERENCES users(id) ON DELETE SET NULL; 