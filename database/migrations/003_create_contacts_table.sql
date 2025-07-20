-- Migration 003: Création de la table contacts
-- Date: 2024-01-01
-- Description: Création de la table contacts avec dépendances

-- Table des contacts clients
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    nom VARCHAR(50) NOT NULL,
    prenom VARCHAR(50) NOT NULL,
    fonction VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telephone VARCHAR(20) NOT NULL,
    est_contact_principal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les performances
CREATE INDEX idx_contacts_client ON contacts(client_id);
CREATE INDEX idx_contacts_principal ON contacts(est_contact_principal);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Contrainte pour s'assurer qu'il n'y a qu'un seul contact principal par client
CREATE UNIQUE INDEX idx_contacts_principal_unique ON contacts(client_id) WHERE est_contact_principal = TRUE; 