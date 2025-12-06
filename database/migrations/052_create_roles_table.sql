-- Migration pour créer la table des rôles
-- Date: 2025-01-03
-- Description: Création de la table roles et insertion des rôles de base

-- Créer la table roles si elle n'existe pas
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Créer la table user_roles si elle n'existe pas
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- Créer la table role_permissions si elle n'existe pas
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- Insérer les rôles de base
INSERT INTO roles (name, description) VALUES
('SUPER_ADMIN', 'Administrateur système avec tous les droits'),
('ADMIN_IT', 'Administrateur informatique'),
('IT', 'Technicien informatique'),
('ADMIN', 'Administrateur général'),
('MANAGER', 'Manager/Chef d\'équipe'),
('CONSULTANT', 'Consultant'),
('COLLABORATEUR', 'Collaborateur standard'),
('ASSOCIE', 'Associé'),
('DIRECTEUR', 'Directeur'),
('SUPER_USER', 'Super utilisateur')
ON CONFLICT (name) DO NOTHING;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Commentaires sur les tables
COMMENT ON TABLE roles IS 'Table des rôles disponibles dans le système';
COMMENT ON TABLE user_roles IS 'Table de liaison entre utilisateurs et rôles (rôles multiples)';
COMMENT ON TABLE role_permissions IS 'Table de liaison entre rôles et permissions';

COMMENT ON COLUMN roles.name IS 'Nom du rôle (unique)';
COMMENT ON COLUMN roles.description IS 'Description du rôle';
COMMENT ON COLUMN user_roles.user_id IS 'ID de l\'utilisateur';
COMMENT ON COLUMN user_roles.role_id IS 'ID du rôle';
COMMENT ON COLUMN role_permissions.role_id IS 'ID du rôle';
COMMENT ON COLUMN role_permissions.permission_id IS 'ID de la permission';





















